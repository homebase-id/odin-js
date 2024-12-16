import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { invalidateCommunities, updateCacheCommunities } from './useCommunities';

type useCommunityProps = {
  odinId: string | undefined;
  communityId: string | undefined;
};

const getEnsureNewDriveAndPermissionPath = (
  name: string,
  description: string,
  targetDrive: TargetDrive,
  attributes: Record<string, string> | undefined,
  allowSubscriptions: boolean,
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
      s: allowSubscriptions,
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
    true,
    returnUrl
  );

  const host = new DotYouClient({
    hostIdentity: identity,
    api: ApiType.App,
  }).getRoot();
  return `${host}${path}`;
};

export const useCommunity = (props?: useCommunityProps) => {
  const { odinId, communityId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchCommunity = async ({ odinId, communityId }: useCommunityProps) => {
    if (!odinId || !communityId) return undefined;

    return (await getCommunityDefinition(dotYouClient, odinId, communityId)) || undefined;
  };

  const saveData = async (
    communityDef: NewHomebaseFile<CommunityDefinition> | HomebaseFile<CommunityDefinition>
  ) => {
    const onMissingDrive = () => {
      if (!communityDef.fileMetadata.appData.uniqueId)
        throw new Error('Community unique id is not set');

      const host = dotYouClient.getHostIdentity();
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
      staleTime: 1000 * 60 * 10, // 10 minutes
      enabled: !!odinId && !!communityId,
    }),
    save: useMutation({
      mutationFn: saveData,
      onMutate: async (toSaveCommunity) => {
        const previousCommunities = updateCacheCommunities(queryClient, (data) =>
          data?.map((chnl) =>
            stringGuidsEqual(
              chnl.fileMetadata.appData.uniqueId,
              toSaveCommunity.fileMetadata.appData.uniqueId
            )
              ? toSaveCommunity
              : chnl
          )
        );

        return { toSaveCommunity, previousCommunities };
      },
      onError: (err, toRemoveAttr, context) => {
        console.warn(err);

        // Revert local caches to what they were
        updateCacheCommunities(queryClient, () => context?.previousCommunities);
      },
      onSettled: (_data, _error, variables) => {
        invalidateCommunity(queryClient, variables.fileMetadata.appData.uniqueId as string);
        invalidateCommunities(queryClient);
      },
    }),
    remove: useMutation({
      mutationFn: removeCommunity,
      onMutate: async (toRemoveCommunity) => {
        const previousCommunities = updateCacheCommunities(queryClient, (data) =>
          data.filter(
            (community) =>
              !stringGuidsEqual(
                community.fileMetadata.appData.uniqueId,
                toRemoveCommunity.fileMetadata.appData.uniqueId
              )
          )
        );

        return { previousCommunities, toRemoveCommunity };
      },
      onError: (err, newData, context) => {
        console.error(err);

        updateCacheCommunities(queryClient, () => context?.previousCommunities);
      },
      onSettled: () => {
        invalidateCommunities(queryClient);
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

  const host = new DotYouClient({
    hostIdentity: identity,
    api: ApiType.App,
  }).getRoot();
  return `${host}/owner/apprequest-circles?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};

export const invalidateCommunity = (queryClient: QueryClient, communityId: string) => {
  queryClient.invalidateQueries({
    queryKey: ['community', communityId].filter(Boolean),
    exact: !!communityId,
  });
};
