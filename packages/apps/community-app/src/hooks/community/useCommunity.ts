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
import { COMMUNITY_ROOT_PATH, useDotYouClientContext } from '@homebase-id/common-app';
import {
  CommunityDefinition,
  getCommunityDefinition,
  getTargetDriveFromCommunityId,
  removeCommunityDefinition,
  saveCommunity,
} from '../../providers/CommunityDefinitionProvider';
import { COMMUNITY_APP_ID, t } from '@homebase-id/common-app';
import {
  AppDriveAuthorizationParams,
  getExtendAppRegistrationParams,
} from '@homebase-id/js-lib/auth';
import { COMMUNITY_DEFAULT_GENERAL_ID } from '../../providers/CommunityProvider';

type useCommunityProps = {
  odinId: string | undefined;
  communityId: string | undefined;
};

const getEnsureNewDriveAndPermissionPath = (
  name: string,
  description: string,
  targetDrive: TargetDrive,
  attributes: Record<string, string> | undefined,
  returnUrl: string
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
      at: JSON.stringify(attributes),
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
  attributes: Record<string, string> | undefined,
  returnUrl: string
) => {
  const path = getEnsureNewDriveAndPermissionPath(
    name,
    description,
    targetDrive,
    attributes,
    returnUrl
  );

  const host = new DotYouClient({ identity: identity || undefined, api: ApiType.App }).getRoot();
  return `${host}${path}`;
};

export const useCommunity = (props?: useCommunityProps) => {
  const { odinId, communityId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchCommunity = async ({ odinId, communityId }: useCommunityProps) => {
    if (!odinId || !communityId) return;

    return await getCommunityDefinition(dotYouClient, odinId, communityId);
  };

  const saveData = async (
    communityDef: NewHomebaseFile<CommunityDefinition> | HomebaseFile<CommunityDefinition>
  ) => {
    const onMissingDrive = () => {
      if (!communityDef.fileMetadata.appData.uniqueId)
        throw new Error('Community unique id is not set');

      const host = dotYouClient.getIdentity();
      const returnUrl = `${COMMUNITY_ROOT_PATH}/new?draft=${JSON.stringify(communityDef)}`;

      const targetDrive = getTargetDriveFromCommunityId(communityDef.fileMetadata.appData.uniqueId);

      const intermediateReturnUrl = getExtendCirclePermissionUrl(
        host,
        communityDef.fileMetadata.appData.content.title,
        t('Drive for "{0}" community', communityDef.fileMetadata.appData.content.title),
        targetDrive,
        communityDef.fileMetadata.appData.content.acl.circleIdList || [],
        returnUrl
      );

      window.location.href = ensureNewDriveAndPermission(
        host,
        communityDef.fileMetadata.appData.content.title,
        t('Drive for "{0}" community', communityDef.fileMetadata.appData.content.title),
        targetDrive,
        { IsCollaborativeChannel: 'true' },
        intermediateReturnUrl
      );
    };

    return await saveCommunity(dotYouClient, { ...communityDef }, onMissingDrive);
  };

  const getInviteLink = async ({
    communityDef,
  }: {
    communityDef: HomebaseFile<CommunityDefinition>;
  }) => {
    return `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect${COMMUNITY_ROOT_PATH}/${communityDef.fileMetadata.senderOdinId}/${communityDef.fileMetadata.appData.uniqueId}/${COMMUNITY_DEFAULT_GENERAL_ID}`;
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

export const getExtendCirclePermissionUrl = (
  identity: string,
  name: string,
  description: string,
  targetDrive: TargetDrive,
  circleIds: string[],
  returnUrl: string
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
    },
  ];

  const params = {
    appId: COMMUNITY_APP_ID,
    cd: JSON.stringify(drives),
    c: circleIds.join(','),
  };

  const host = new DotYouClient({ identity: identity || undefined, api: ApiType.App }).getRoot();
  return `${host}/owner/apprequest-circles?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};