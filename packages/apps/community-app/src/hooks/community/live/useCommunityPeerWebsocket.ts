import { useDotYouClientContext, useWebsocketSubscriber } from '@homebase-id/common-app';
import {
  DotYouClient,
  TypedConnectionNotification,
  TargetDrive,
  DEFAULT_PAYLOAD_KEY,
  decryptKeyHeader,
  EncryptedKeyHeader,
  decryptJsonContent,
  HomebaseFile,
  getPayloadAsJson,
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
import { getPayloadAsJsonOverPeer } from '@homebase-id/js-lib/peer';

const isDebug = hasDebugFlag();

export const useCommunityPeerWebsocket = (
  odinId: string | undefined,
  communityId: string | undefined,
  isEnabled: boolean
) => {
  const queryClient = useQueryClient();
  const targetDrive = getTargetDriveFromCommunityId(communityId || '');
  const dotYouClient = useDotYouClientContext();

  const handler = useCallback(
    async (decryptionClient: DotYouClient, notification: TypedConnectionNotification) => {
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
          const channelId = notification.header.fileMetadata.appData.groupId;

          // This skips the invalidation of all chat messages, as we only need to add/update this specific message
          const updatedChatMessage = await wsDsrToMessage(
            decryptionClient,
            dotYouClient,
            notification.header,
            odinId,
            targetDrive
          );

          if (
            !updatedChatMessage ||
            Object.keys(updatedChatMessage.fileMetadata.appData.content).length === 0
          ) {
            // Something is up with the message, invalidate all messages for this conversation
            console.warn('[CommunityWebsocket] Invalid message received', notification, channelId);
            invalidateCommunityMessages(queryClient, communityId, channelId);
            return;
          }

          insertNewMessage(queryClient, updatedChatMessage, communityId);
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
    () => {
      queryClient.invalidateQueries({ queryKey: ['process-inbox'] });
    },
    undefined,
    'useCommunityPeerWebsocket'
  );
};

const wsDsrToMessage = async (
  websocketDotyouClient: DotYouClient,
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  odinId: string | undefined,
  targetDrive: TargetDrive
): Promise<HomebaseFile<CommunityMessage> | null> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  if (!fileId || !fileMetadata) {
    throw new Error(
      '[useCommunityPeerWebsocket] wsDsrToMessage: fileId or fileMetadata is undefined'
    );
  }

  const contentIsComplete =
    fileMetadata.payloads.filter((payload) => payload.key === DEFAULT_PAYLOAD_KEY).length === 0;
  if (fileMetadata.isEncrypted && !sharedSecretEncryptedKeyHeader) return null;

  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(
        websocketDotyouClient,
        sharedSecretEncryptedKeyHeader as EncryptedKeyHeader
      )
    : undefined;

  let content: CommunityMessage | undefined;
  if (contentIsComplete) {
    content = tryJsonParse<CommunityMessage>(await decryptJsonContent(fileMetadata, keyHeader));
  } else {
    content =
      (odinId && odinId !== dotYouClient.getIdentity()
        ? await getPayloadAsJsonOverPeer<CommunityMessage>(
            dotYouClient,
            odinId,
            targetDrive,
            fileId,
            DEFAULT_PAYLOAD_KEY
          )
        : await getPayloadAsJson<CommunityMessage>(
            dotYouClient,
            targetDrive,
            fileId,
            DEFAULT_PAYLOAD_KEY
          )) || undefined;
  }

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
