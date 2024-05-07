import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ChannelDefinition,
  CollaborativeChannelDefinition,
  GetTargetDriveFromChannelId,
  saveChannelDefinition,
} from '@youfoundation/js-lib/public';

import { FEED_APP_ID, t, useCircles, useDotYouClient } from '../../../..';
import { stringGuidsEqual, stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import {
  DrivePermissionType,
  HomebaseFile,
  SecurityGroupType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
const FEED_ROOT_PATH = '/apps/feed';
import { useChannel } from './useChannel';
import { ALL_CONNECTIONS_CIRCLE_ID } from '@youfoundation/js-lib/network';
import { useChannelDrives } from '../../socialFeed/useChannelDrives';

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
    },
  ];

  const params = {
    appId: FEED_APP_ID,
    d: JSON.stringify(drives),
  };

  return `https://${identity}/owner/apprequest-drives?${stringifyToQueryParams(
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

  return `https://${identity}/owner/apprequest-circles?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};

export const useCollaborativeChannel = (props?: { channelId: string }) => {
  const { channelId } = props || {};
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();

  const { data: channelDef, isFetched: isChannelFetched } = useChannel({ channelId }).fetch;
  const { data: circles } = useCircles().fetch;
  const { data: channelDrives } = useChannelDrives(true);

  const validateCollaborativeChannel = () => {
    if (!channelId || !channelDef?.fileMetadata.appData.content.isCollaborative) return null;

    const circleIds = channelDef.serverMetadata?.accessControlList.circleIdList || [
      ALL_CONNECTIONS_CIRCLE_ID,
    ];

    const targetDrive = GetTargetDriveFromChannelId(channelId);

    const circlesWithMissingPermissions = circleIds.filter((circleId) => {
      const circle = circles?.find((c) => stringGuidsEqual(c.id, circleId));

      const writeGrant = circle?.driveGrants?.find((grant) => {
        if (
          stringGuidsEqual(grant.permissionedDrive?.drive.alias, targetDrive.alias) &&
          stringGuidsEqual(grant.permissionedDrive?.drive.type, targetDrive.type) &&
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
    const channelDrive = channelDrives?.find(
      (d) =>
        stringGuidsEqual(d.targetDriveInfo.alias, targetDrive.alias) &&
        stringGuidsEqual(d.targetDriveInfo.type, targetDrive.type)
    );
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
        : [ALL_CONNECTIONS_CIRCLE_ID];

    if (!collaborativeCircleIds.length) throw new Error('No circles found for channel');

    const identity = dotYouClient.getIdentity();
    const returnUrl = `${FEED_ROOT_PATH}/channels`;

    const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

    const collaborativeChannelDef = { ...channelDef };
    collaborativeChannelDef.fileMetadata.appData.content.isCollaborative = true;
    (collaborativeChannelDef.fileMetadata.appData.content as CollaborativeChannelDefinition).acl =
      channelDef.serverMetadata.accessControlList;
    await saveChannelDefinition(dotYouClient, collaborativeChannelDef);

    const intermediaReturnUrl = getExtendDriveDetailsUrl(
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
      intermediaReturnUrl
    );
  };

  const makeChannelPrivate = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    if (!channelDef.fileMetadata.appData.uniqueId) throw new Error('Channel unique id is not set');

    const collaborativeChannelDef = { ...channelDef };
    collaborativeChannelDef.fileMetadata.appData.content.isCollaborative = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (collaborativeChannelDef.fileMetadata.appData.content as any).acl;
    await saveChannelDefinition(dotYouClient, collaborativeChannelDef);

    const identity = dotYouClient.getIdentity();
    const returnUrl = `${FEED_ROOT_PATH}/channels`;

    const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

    window.location.href = getExtendDriveDetailsUrl(identity, targetDrive, returnUrl, undefined, {
      IsCollaborativeChannel: 'false',
    });
  };

  return {
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
