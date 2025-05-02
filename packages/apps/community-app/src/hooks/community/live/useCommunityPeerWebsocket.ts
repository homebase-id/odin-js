import { useWebsocketSubscriber } from '@homebase-id/common-app';
import {
  OdinClient,
  TypedConnectionNotification,
  TargetDrive,
  decryptKeyHeader,
  EncryptedKeyHeader,
  decryptJsonContent,
  HomebaseFile,
} from '@homebase-id/js-lib/core';
import { drivesEqual, hasDebugFlag, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getTargetDriveFromCommunityId } from '../../../providers/CommunityDefinitionProvider';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import {
  COMMUNITY_CHANNEL_FILE_TYPE,
  dsrToCommunityChannel,
} from '../../../providers/CommunityProvider';
import { useWebsocketDrives } from '../../auth/useWebsocketDrives';
import {
  insertNewCommunityChannel,
  invalidateCommunityChannels,
  removeCommunityChannel,
} from '../channels/useCommunityChannels';
import {
  insertNewMessage,
  invalidateCommunityMessages,
  removeMessage,
} from '../messages/useCommunityMessages';
import { invalidateCommunityThreads } from '../threads/useCommunityThreads';

const isDebug = hasDebugFlag();

export const useCommunityPeerWebsocket = (
  odinId: string | undefined,
  communityId: string | undefined,
  isEnabled: boolean
) => {
  const queryClient = useQueryClient();
  const targetDrive = getTargetDriveFromCommunityId(communityId || '');

  const handler = useCallback(
    async (decryptionClient: OdinClient, notification: TypedConnectionNotification) => {
      if (!communityId) {
        console.warn('[CommunityWebsocket] No communityId', notification);
        return;
      }
      isDebug && console.debug('[PeerCommunityWebsocket] Got notification', notification);
      if (
        (notification.notificationType === 'fileAdded' ||
          notification.notificationType === 'fileModified' ||
          notification.notificationType === 'statisticsChanged') &&
        drivesEqual(notification.targetDrive, targetDrive)
      ) {
        if (notification.header.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE) {
          const groupId = notification.header.fileMetadata.appData.groupId;

          // This skips the invalidation of all chat messages, as we only need to add/update this specific message
          const updatedChatMessage = await wsDsrToMessage(decryptionClient, notification.header);
          if (
            !updatedChatMessage ||
            Object.keys(updatedChatMessage.fileMetadata.appData.content).length === 0
          ) {
            // Something is up with the message, invalidate all messages for this conversation
            console.warn('[CommunityWebsocket] Invalid message received', notification, groupId);
            invalidateCommunityMessages(queryClient, communityId, groupId);
            return;
          }

          insertNewMessage(queryClient, updatedChatMessage, communityId);

          if (updatedChatMessage.fileSystemType.toLowerCase() === 'comment')
            invalidateCommunityThreads(queryClient, communityId);
        } else if (
          notification.header.fileMetadata.appData.fileType === COMMUNITY_CHANNEL_FILE_TYPE
        ) {
          const communityChannel = await dsrToCommunityChannel(
            decryptionClient,
            notification.header,
            odinId,
            targetDrive,
            true
          );
          if (!communityChannel) {
            console.warn('[CommunityWebsocket] Invalid channel received', notification);
            invalidateCommunityChannels(queryClient, communityId);
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
    [odinId, communityId]
  );

  const { localCommunityDrives, remoteCommunityDrives } = useWebsocketDrives();
  const drives = odinId === window.location.host ? localCommunityDrives : remoteCommunityDrives;

  return useWebsocketSubscriber(
    isEnabled && !!communityId && !!drives ? handler : undefined,
    odinId,
    ['fileAdded', 'fileModified', 'fileDeleted', 'statisticsChanged'],
    drives as TargetDrive[],
    () => queryClient.invalidateQueries({ queryKey: ['process-community-inbox'] }),
    () => queryClient.invalidateQueries({ queryKey: ['process-community-inbox'] }),
    'useCommunityPeerWebsocket'
  );
};

const wsDsrToMessage = async (
  websocketOdinClient: OdinClient,
  dsr: HomebaseFile
): Promise<HomebaseFile<CommunityMessage> | null> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  if (!fileId || !fileMetadata) {
    throw new Error(
      '[useCommunityPeerWebsocket] wsDsrToMessage: fileId or fileMetadata is undefined'
    );
  }

  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(
      websocketOdinClient,
      sharedSecretEncryptedKeyHeader as EncryptedKeyHeader
    )
    : undefined;

  const content = tryJsonParse<CommunityMessage>(await decryptJsonContent(fileMetadata, keyHeader));

  if (!content) return null;

  return {
    ...dsr,
    sharedSecretEncryptedKeyHeader: keyHeader as unknown as EncryptedKeyHeader,
    fileMetadata: {
      ...fileMetadata,
      appData: {
        ...fileMetadata.appData,
        content: content,
      },
    },
  };
};
