import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  CollaborativeChannelDefinition,
  GetTargetDriveFromChannelId,
  RemoteCollaborativeChannelDefinition,
  removeChannelLink,
  saveChannelDefinition,
  saveChannelLink,
} from '@homebase-id/js-lib/public';

import {
  FEED_APP_ID,
  FEED_ROOT_PATH,
  t,
  useChannelDrives,
  useCircles,
  useOdinClientContext,
} from '../../../..';
import { drivesEqual, stringGuidsEqual, stringifyToQueryParams } from '@homebase-id/js-lib/helpers';
import {
  ApiType,
  OdinClient,
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  TargetDrive,
} from '@homebase-id/js-lib/core';
import { useChannel } from './useChannel';
import { CONFIRMED_CONNECTIONS_CIRCLE_ID } from '@homebase-id/js-lib/network';

const getExtendDriveDetailsUrl = (
  identity: string,
  targetDrive: TargetDrive,
  returnUrl: string,
  allowAnonymousReads?: boolean,
  attributes?: Record<string, string>
) => {
  const drives = [
    {
      a: targetDrive.alias,
      t: targetDrive.type,
      r: allowAnonymousReads,
      at: JSON.stringify(attributes),
      p:
        DrivePermissionType.Read +
        DrivePermissionType.Write +
        DrivePermissionType.React +
        DrivePermissionType.Comment, // Permission
    },
  ];

  const params = {
    appId: FEED_APP_ID,
    d: JSON.stringify(drives),
  };

  const host = new OdinClient({
    hostIdentity: identity,
    api: ApiType.App,
  }).getRoot();
  return `${host}/owner/apprequest-drives?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};

const getExtendCirclePermissionUrl = (
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
    appId: FEED_APP_ID,
    cd: JSON.stringify(drives),
    c: circleIds.join(','),
  };

  const host = new OdinClient({
    hostIdentity: identity,
    api: ApiType.App,
  }).getRoot();
  return `${host}/owner/apprequest-circles?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};

export const useCollaborativeChannel = (props?: { channelId: string }) => {
  const { channelId } = props || {};
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const { data: channelDef, isFetched: isChannelFetched } = useChannel({
    channelKey: channelId,
  }).fetch;
  const { data: circles } = useCircles().fetch;
  const { data: channelDrives } = useChannelDrives(true);

  const saveCollaborativeChannel = async (
    chnlLink: NewHomebaseFile<RemoteCollaborativeChannelDefinition>
  ) => {
    return await saveChannelLink(odinClient, chnlLink);
  };

  const removeCollaborativeChannel = async (
    chnlLink: HomebaseFile<RemoteCollaborativeChannelDefinition>
  ) => {
    return await removeChannelLink(odinClient, chnlLink);
  };

  const validateCollaborativeChannel = () => {
    if (!channelId || !channelDef?.fileMetadata.appData.content.isCollaborative) return null;

    const circleIds = channelDef.serverMetadata?.accessControlList.circleIdList || [
      CONFIRMED_CONNECTIONS_CIRCLE_ID,
    ];

    const targetDrive = GetTargetDriveFromChannelId(channelId);

    const circlesWithMissingPermissions = circleIds.filter((circleId) => {
      const circle = circles?.find((c) => stringGuidsEqual(c.id, circleId));

      const writeGrant = circle?.driveGrants?.find((grant) => {
        if (
          drivesEqual(grant.permissionedDrive?.drive, targetDrive) &&
          grant.permissionedDrive.permission.includes(DrivePermissionType.Write)
        ) {
          return true;
        }

        return false;
      });

      if (!writeGrant) return true;
    });

    if (circlesWithMissingPermissions.length) {
      return { invalidDrivePermission: true };
    }

    // We don't have to check both.. As one fail is enough
    const channelDrive = channelDrives?.find((d) => drivesEqual(d.targetDriveInfo, targetDrive));
    if (channelDrive?.attributes.IsCollaborativeChannel !== 'true') {
      return { invalidDriveAttribute: true };
    }

    return null;
  };

  const makeChannelCollaborative = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    if (!channelDef.fileMetadata.appData.uniqueId) throw new Error('Channel unique id is not set');
    if (!channelDef.serverMetadata) throw new Error('Channel is not access as the owner');

    const collaborativeCircleIds =
      channelDef.serverMetadata?.accessControlList.requiredSecurityGroup ===
        SecurityGroupType.Connected && channelDef.serverMetadata?.accessControlList.circleIdList
        ? channelDef.serverMetadata?.accessControlList.circleIdList
        : [CONFIRMED_CONNECTIONS_CIRCLE_ID];

    if (!collaborativeCircleIds.length) throw new Error('No circles found for channel');

    const identity = odinClient.getHostIdentity();
    const returnUrl = `${FEED_ROOT_PATH}/channels`;

    const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

    const collaborativeChannelDef = { ...channelDef };
    collaborativeChannelDef.fileMetadata.appData.content.isCollaborative = true;
    (collaborativeChannelDef.fileMetadata.appData.content as CollaborativeChannelDefinition).acl =
      channelDef.serverMetadata.accessControlList;
    await saveChannelDefinition(odinClient, collaborativeChannelDef);

    const intermediateReturnUrl = getExtendDriveDetailsUrl(
      identity,
      targetDrive,
      returnUrl,
      undefined,
      { IsCollaborativeChannel: 'true' }
    );

    window.location.href = getExtendCirclePermissionUrl(
      identity,
      channelDef.fileMetadata.appData.content.name,
      t('Drive for "{0}" channel posts', channelDef.fileMetadata.appData.content.name),
      targetDrive,
      collaborativeCircleIds,
      intermediateReturnUrl
    );
  };

  const makeChannelPrivate = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    if (!channelDef.fileMetadata.appData.uniqueId) throw new Error('Channel unique id is not set');

    const collaborativeChannelDef = { ...channelDef };
    collaborativeChannelDef.fileMetadata.appData.content.isCollaborative = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (collaborativeChannelDef.fileMetadata.appData.content as any).acl;
    await saveChannelDefinition(odinClient, collaborativeChannelDef);

    const identity = odinClient.getHostIdentity();
    const returnUrl = `${FEED_ROOT_PATH}/channels`;

    const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

    window.location.href = getExtendDriveDetailsUrl(identity, targetDrive, returnUrl, undefined, {
      IsCollaborativeChannel: 'false',
    });
  };

  return {
    save: useMutation({
      mutationFn: saveCollaborativeChannel,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['collaborative-channels'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeCollaborativeChannel,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['collaborative-channels'] });
      },
    }),
    validate: useQuery({
      queryKey: ['validate-collaborative', channelId],
      queryFn: validateCollaborativeChannel,
      enabled: !!isChannelFetched && !!circles && !!channelDrives,
    }),
    convertToCollaborativeChannel: useMutation({
      mutationFn: makeChannelCollaborative,
    }),
    convertToPrivateChannel: useMutation({
      mutationFn: makeChannelPrivate,
    }),
  };
};
