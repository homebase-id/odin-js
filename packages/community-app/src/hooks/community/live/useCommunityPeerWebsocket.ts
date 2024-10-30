import { useWebsocketSubscriber } from '@homebase-id/common-app';
import { DotYouClient, TypedConnectionNotification, TargetDrive } from '@homebase-id/js-lib/core';
import { drivesEqual, formatGuidId, hasDebugFlag } from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getTargetDriveFromCommunityId } from '../../../providers/CommunityDefinitionProvider';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  dsrToMessage,
} from '../../../providers/CommunityMessageProvider';
import {
  COMMUNITY_CHANNEL_FILE_TYPE,
  dsrToCommunityChannel,
} from '../../../providers/CommunityProvider';
import { useWebsocketDrives } from '../../auth/useWebsocketDrives';
import {
  insertNewCommunityChannel,
  removeCommunityChannel,
} from '../channels/useCommunityChannels';
import { insertNewMessage, removeMessage } from '../messages/useCommunityMessages';

const isDebug = hasDebugFlag();

export const useCommunityPeerWebsocket = (
  odinId: string | undefined,
  communityId: string | undefined,
  isEnabled: boolean
) => {
  const queryClient = useQueryClient();
  const targetDrive = getTargetDriveFromCommunityId(communityId || '');

  const handler = useCallback(
    async (dotYouClient: DotYouClient, notification: TypedConnectionNotification) => {
      if (!communityId) {
        console.warn('[CommunityWebsocket] No communityId', notification);
        return;
      }
      isDebug && console.debug('[CommunityWebsocket] Got notification', notification);

      if (
        (notification.notificationType === 'fileAdded' ||
          notification.notificationType === 'fileModified' ||
          notification.notificationType === 'statisticsChanged') &&
        drivesEqual(notification.targetDrive, targetDrive)
      ) {
        if (notification.header.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE) {
          const channelId = notification.header.fileMetadata.appData.groupId;

          // This skips the invalidation of all chat messages, as we only need to add/update this specific message
          const updatedChatMessage = await dsrToMessage(
            dotYouClient,
            notification.header,
            odinId,
            targetDrive,
            true
          );

          if (
            !updatedChatMessage ||
            Object.keys(updatedChatMessage.fileMetadata.appData.content).length === 0
          ) {
            // Something is up with the message, invalidate all messages for this conversation
            console.warn('[CommunityWebsocket] Invalid message received', notification, channelId);
            queryClient.invalidateQueries({
              queryKey: ['community-messages', formatGuidId(channelId)],
            });
            return;
          }

          insertNewMessage(queryClient, updatedChatMessage, communityId);
        } else if (
          notification.header.fileMetadata.appData.fileType === COMMUNITY_CHANNEL_FILE_TYPE
        ) {
          const communityChannel = await dsrToCommunityChannel(
            dotYouClient,
            notification.header,
            targetDrive,
            true
          );
          if (!communityChannel) {
            console.warn('[CommunityWebsocket] Invalid channel received', notification);
            queryClient.invalidateQueries({
              queryKey: ['community-channels', formatGuidId(communityId)],
            });
            return;
          }
          insertNewCommunityChannel(queryClient, communityChannel, communityId);
        }
      }

      if (
        notification.notificationType === 'fileDeleted' &&
        drivesEqual(notification.targetDrive, targetDrive)
      ) {
        if (notification.header.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE) {
          removeMessage(queryClient, notification.header, communityId);
        } else if (
          notification.header.fileMetadata.appData.fileType === COMMUNITY_CHANNEL_FILE_TYPE
        ) {
          removeCommunityChannel(queryClient, notification.header, communityId);
        }
      }
    },
    [communityId]
  );

  const { localCommunityDrives, remoteCommunityDrives } = useWebsocketDrives();
  const drives = odinId === window.location.host ? localCommunityDrives : remoteCommunityDrives;

  return useWebsocketSubscriber(
    isEnabled && !!communityId && !!drives ? handler : undefined,
    odinId,
    ['fileAdded', 'fileModified', 'fileDeleted', 'statisticsChanged'],
    drives as TargetDrive[],
    () => {
      queryClient.invalidateQueries({ queryKey: ['process-inbox'] });
    },
    undefined,
    'useLiveCommunityPeerProcessor'
  );
};
