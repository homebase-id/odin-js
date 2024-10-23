import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stringGuidsEqual, stringifyToQueryParams } from '@homebase-id/js-lib/helpers';
import {
  ApiType,
  DotYouClient,
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  TargetDrive,
} from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  CommunityDefinition,
  getCommunityDefinition,
  getTargetDriveFromCommunityId,
  removeCommunityDefinition,
  saveCommunity,
} from '../../providers/CommunityDefinitionProvider';
import { COMMUNITY_APP_ID, t } from '@homebase-id/common-app';
import { ROOT_PATH as COMMUNITY_ROOT } from '../../app/App';
import {
  AppDriveAuthorizationParams,
  getExtendAppRegistrationParams,
} from '@homebase-id/js-lib/auth';

type useCommunityProps = {
  odinId: string | undefined;
  communityId: string | undefined;
};

const getEnsureNewDriveAndPermissionPath = (
  name: string,
  description: string,
  targetDrive: TargetDrive,
  returnUrl: string
) => {
  const drives: AppDriveAuthorizationParams[] = [
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
    },
  ];

  const circleDrives: AppDriveAuthorizationParams[] = [
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
    },
  ];

  const params = getExtendAppRegistrationParams(
    COMMUNITY_APP_ID,
    drives,
    circleDrives,
    undefined,
    undefined,
    returnUrl
  );

  return `/owner/appupdate?${stringifyToQueryParams(params)}`;
};

const ensureNewDriveAndPermission = (
  identity: string,
  name: string,
  description: string,
  targetDrive: TargetDrive,
  returnUrl: string
) => {
  const path = getEnsureNewDriveAndPermissionPath(name, description, targetDrive, returnUrl);

  const host = new DotYouClient({ identity: identity || undefined, api: ApiType.App }).getRoot();
  return `${host}${path}`;
};

export const useCommunity = (props?: useCommunityProps) => {
  const { odinId, communityId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchCommunity = async ({ odinId, communityId }: useCommunityProps) => {
    if (!odinId || !communityId) return null;

    return await getCommunityDefinition(dotYouClient, odinId, communityId);
  };

  const saveData = async (
    communityDef: NewHomebaseFile<CommunityDefinition> | HomebaseFile<CommunityDefinition>
  ) => {
    const onMissingDrive = () => {
      if (!communityDef.fileMetadata.appData.uniqueId)
        throw new Error('Community unique id is not set');

      const host = dotYouClient.getIdentity();
      const returnUrl = `${COMMUNITY_ROOT}/new?draft=${JSON.stringify(communityDef)}`;

      const targetDrive = getTargetDriveFromCommunityId(communityDef.fileMetadata.appData.uniqueId);

      window.location.href = ensureNewDriveAndPermission(
        host,
        communityDef.fileMetadata.appData.content.title,
        t('Drive for "{0}" community', communityDef.fileMetadata.appData.content.title),
        targetDrive,
        returnUrl
      );
    };

    return await saveCommunity(dotYouClient, { ...communityDef }, onMissingDrive);
  };

  const getInviteLink = async ({
    communityDef,
  }: {
    communityDef: HomebaseFile<CommunityDefinition>;
  }) => {
    if (!communityDef.fileMetadata.appData.uniqueId) return '';

    const returnUrl = `${COMMUNITY_ROOT}/new?draft=${JSON.stringify(communityDef)}`;

    const targetDrive = getTargetDriveFromCommunityId(communityDef.fileMetadata.appData.uniqueId);

    return (
      `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect` +
      getEnsureNewDriveAndPermissionPath(
        communityDef.fileMetadata.appData.content.title,
        t('Drive for "{0}" community', communityDef.fileMetadata.appData.content.title),
        targetDrive,
        returnUrl
      )
    );
  };

  const removeCommunity = async (communityDef: HomebaseFile<CommunityDefinition>) =>
    await removeCommunityDefinition(dotYouClient, communityDef);

  return {
    fetch: useQuery({
      queryKey: ['community', communityId],
      queryFn: () => fetchCommunity({ odinId, communityId }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId && !!communityId,
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
        console.warn(err);

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
    getInviteLink: useMutation({
      mutationFn: getInviteLink,
    }),
  };
};
