import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stringGuidsEqual, stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import {
  ApiType,
  DotYouClient,
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import {
  CommunityDefinition,
  getCommunityDefinition,
  getTargetDriveFromCommunityId,
  removeCommunityDefinition,
  saveCommunity,
} from '../../providers/CommunityDefinitionProvider';
import { COMMUNITY_APP_ID, t } from '@youfoundation/common-app';
import { COMMUNITY_ROOT } from '../../templates/Community/CommunityHome';
import { getExtendAppRegistrationParams } from '@youfoundation/js-lib/auth';

type useCommunityProps = {
  communityId?: string;
};

const ensureNewDriveAndPermission = (
  identity: string,
  name: string,
  description: string,
  targetDrive: TargetDrive,
  returnUrl: string,
  allowAnonymousReads?: boolean,
  allowSubscriptions?: boolean
) => {
  const drives = [
    {
      a: targetDrive.alias,
      t: targetDrive.type,
      p:
        DrivePermissionType.Read +
        DrivePermissionType.Write +
        DrivePermissionType.React +
        DrivePermissionType.Comment, // Permission
      n: name,
      d: description,
      r: allowAnonymousReads,
      s: allowSubscriptions,
    },
  ];

  const params = getExtendAppRegistrationParams(
    COMMUNITY_APP_ID,
    drives,
    undefined,
    undefined,
    returnUrl
  );

  const host = new DotYouClient({ identity: identity || undefined, api: ApiType.App }).getRoot();
  return `${host}/owner/appupdate?${stringifyToQueryParams(params)}`;
};

export const useCommunity = ({ communityId }: useCommunityProps) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchCommunity = async ({ communityId }: useCommunityProps) => {
    if (!communityId) return null;

    return await getCommunityDefinition(dotYouClient, communityId);
  };

  const saveData = async (
    communityDef: NewHomebaseFile<CommunityDefinition> | HomebaseFile<CommunityDefinition>
  ) => {
    const onMissingDrive = () => {
      if (!communityDef.fileMetadata.appData.uniqueId)
        throw new Error('Community unique id is not set');

      const host = dotYouClient.getIdentity();
      const returnUrl = `${COMMUNITY_ROOT}?new=${JSON.stringify(communityDef)}`;

      const targetDrive = getTargetDriveFromCommunityId(communityDef.fileMetadata.appData.uniqueId);

      window.location.href = ensureNewDriveAndPermission(
        host,
        communityDef.fileMetadata.appData.content.title,
        t('Drive for "{0}" community', communityDef.fileMetadata.appData.content.title),
        targetDrive,
        returnUrl,
        true,
        true
      );
    };

    return await saveCommunity(dotYouClient, { ...communityDef }, onMissingDrive);
  };

  const removeCommunity = async (communityDef: HomebaseFile<CommunityDefinition>) =>
    await removeCommunityDefinition(dotYouClient, communityDef);

  return {
    fetch: useQuery({
      queryKey: ['community', communityId],
      queryFn: () => fetchCommunity({ communityId }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!communityId,
    }),
    save: useMutation({
      mutationFn: saveData,
      onMutate: async (toSaveCommunity) => {
        await queryClient.cancelQueries({ queryKey: ['communities'] });

        // Update communities
        const previousCommunities: HomebaseFile<CommunityDefinition>[] | undefined =
          queryClient.getQueryData(['communities']);
        const updatedCommunities = previousCommunities?.map((chnl) =>
          stringGuidsEqual(
            chnl.fileMetadata.appData.uniqueId,
            toSaveCommunity.fileMetadata.appData.uniqueId
          )
            ? toSaveCommunity
            : chnl
        );
        queryClient.setQueryData(['communities'], updatedCommunities);

        queryClient.setQueryData(
          ['community', toSaveCommunity.fileMetadata.appData.uniqueId],
          toSaveCommunity
        );

        return { toSaveCommunity, previousCommunities };
      },
      onError: (err, toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['communities'], context?.previousCommunities);
      },
      onSettled: (_data, _error, variables) => {
        // Boom baby!
        if (
          variables.fileMetadata.appData.uniqueId &&
          variables.fileMetadata.appData.uniqueId !== ''
        ) {
          queryClient.invalidateQueries({
            queryKey: ['community', variables.fileMetadata.appData.uniqueId],
          });
        }

        queryClient.invalidateQueries({
          queryKey: ['community', variables.fileMetadata.appData.uniqueId],
        });
        queryClient.invalidateQueries({ queryKey: ['communitities'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeCommunity,
      onMutate: async (toRemoveCommunity) => {
        await queryClient.cancelQueries({ queryKey: ['communities'] });

        const previousCommunities: HomebaseFile<CommunityDefinition>[] | undefined =
          queryClient.getQueryData(['communities']);
        const newCommunities = previousCommunities?.filter(
          (community) =>
            !stringGuidsEqual(
              community.fileMetadata.appData.uniqueId,
              toRemoveCommunity.fileMetadata.appData.uniqueId
            )
        );

        queryClient.setQueryData(['communities'], newCommunities);

        return { previousCommunities, toRemoveCommunity };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['communities'], context?.previousCommunities);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['communities'] });
      },
    }),
  };
};
