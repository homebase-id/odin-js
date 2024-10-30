import {
  useDotYouClientContext,
  insertNewNotification,
  incrementAppIdNotificationCount,
  useWebsocketSubscriber,
} from '@homebase-id/common-app';
import {
  DotYouClient,
  TypedConnectionNotification,
  AppNotification,
  TargetDrive,
} from '@homebase-id/js-lib/core';
import { hasDebugFlag, drivesEqual } from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  LOCAL_COMMUNITY_APP_DRIVE,
  COMMUNITY_METADATA_FILE_TYPE,
  dsrToCommunityMetadata,
} from '../../../providers/CommunityMetadataProvider';
import { useWebsocketDrives } from '../../auth/useWebsocketDrives';
import { insertNewcommunityMetadata } from '../useCommunityMetadata';

const isDebug = hasDebugFlag();

export const useCommunityWebsocket = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const targetDrive = LOCAL_COMMUNITY_APP_DRIVE;

  const handler = useCallback(
    async (_: DotYouClient, notification: TypedConnectionNotification) => {
      if (!communityId) return;
      isDebug && console.debug('[CommunityWebsocket] Got notification', notification);

      if (
        (notification.notificationType === 'fileAdded' ||
          notification.notificationType === 'fileModified') &&
        drivesEqual(notification.targetDrive, targetDrive)
      ) {
        if (notification.header.fileMetadata.appData.fileType === COMMUNITY_METADATA_FILE_TYPE) {
          const communityMetadata = await dsrToCommunityMetadata(
            dotYouClient,
            notification.header,
            targetDrive,
            true
          );
          if (!communityMetadata) {
            console.warn('[CommunityWebsocket] Invalid channel received', notification);
            return;
          }
          insertNewcommunityMetadata(queryClient, communityMetadata);
        }
      }

      if (notification.notificationType === 'appNotificationAdded') {
        const clientNotification = notification as AppNotification;

        insertNewNotification(queryClient, clientNotification);
        incrementAppIdNotificationCount(queryClient, clientNotification.options.appId);
      }
    },
    []
  );

  const { localCommunityDrives } = useWebsocketDrives();

  return useWebsocketSubscriber(
    localCommunityDrives ? handler : undefined,
    undefined,
    ['fileAdded', 'fileModified', 'fileDeleted'],
    localCommunityDrives as TargetDrive[],
    undefined,
    undefined,
    'useLiveCommunityProcessor'
  );
};
