import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  incrementAppIdNotificationCount,
  insertNewNotification,
  useDotYouClientContext,
  useWebsocketSubscriber,
  useWebsocketSubscriberOverPeer,
} from '@homebase-id/common-app';
import {
  drivesEqual,
  formatGuidId,
  getQueryBatchCursorFromTime,
  getQueryModifiedCursorFromTime,
  hasDebugFlag,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import { processInbox, queryBatchOverPeer, queryModifiedOverPeer } from '@homebase-id/js-lib/peer';
import { getTargetDriveFromCommunityId } from '../../providers/CommunityDefinitionProvider';
import {
  AppNotification,
  DeletedHomebaseFile,
  DotYouClient,
  FileQueryParams,
  HomebaseFile,
  queryBatch,
  queryModified,
  TargetDrive,
  TypedConnectionNotification,
} from '@homebase-id/js-lib/core';
import { insertNewMessage, insertNewMessagesForChannel } from './messages/useCommunityMessages';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  CommunityMessage,
  dsrToMessage,
} from '../../providers/CommunityMessageProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COMMUNITY_CHANNEL_FILE_TYPE,
  dsrToCommunityChannel,
} from '../../providers/CommunityProvider';
import { insertNewCommunityChannel } from './channels/useCommunityChannels';
import {
  COMMUNITY_METADATA_FILE_TYPE,
  dsrToCommunityMetadata,
} from '../../providers/CommunityMetadataProvider';
import { insertNewcommunityMetadata } from './useCommunityMetadata';

const MINUTE_IN_MS = 60000;
const isDebug = hasDebugFlag();

// We first process the inbox, then we connect for live updates;
export const useLiveCommunityProcessor = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const dotYouClient = useDotYouClientContext();

  // Process the inbox on startup; As we want to cover the backlog of messages first
  const { status: inboxStatus } = useInboxProcessor(odinId, communityId || '');

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useCommunityWebsocket(
    odinId,
    communityId,
    inboxStatus === 'success' || odinId !== dotYouClient.getIdentity()
  );

  return isOnline;
};

const BATCH_SIZE = 2000;
// Process the inbox on startup
const useInboxProcessor = (odinId: string | undefined, communityId: string | undefined) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const targetDrive = getTargetDriveFromCommunityId(communityId || '');

  const fetchData = async () => {
    if (!communityId) return;
    const lastProcessedTime = queryClient.getQueryState(['process-inbox'])?.dataUpdatedAt;
    const lastProcessedWithBuffer = lastProcessedTime && lastProcessedTime - MINUTE_IN_MS * 2;

    const processedresult =
      !odinId || odinId === dotYouClient.getIdentity()
        ? await processInbox(dotYouClient, targetDrive, BATCH_SIZE)
        : null;

    isDebug && console.debug('[InboxProcessor] fetching updates since', lastProcessedWithBuffer);
    if (lastProcessedWithBuffer) {
      const newMessages = await findChangesSinceTimestamp(
        dotYouClient,
        odinId,
        lastProcessedWithBuffer,
        {
          targetDrive: targetDrive,
          fileType: [COMMUNITY_MESSAGE_FILE_TYPE],
          fileState: [0, 1],
        }
      );
      isDebug && console.debug('[InboxProcessor] new messages', newMessages.length);

      await processCommunityMessagesBatch(
        dotYouClient,
        queryClient,
        targetDrive,
        communityId,
        newMessages
      );
    } else {
      // We have no reference to the last time we processed the inbox, so we can only invalidate all chat messages
      queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
    }

    return processedresult;
  };

  // We refetch this one on mount as each mount the websocket would reconnect, and there might be a backlog of messages
  return useQuery({
    queryKey: ['process-inbox'],
    queryFn: fetchData,
    enabled: !!communityId,
    staleTime: 1000 * 10, // 10 seconds
  });
};

const useCommunityWebsocket = (
  odinId: string | undefined,
  communityId: string | undefined,
  isEnabled: boolean
) => {
  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getIdentity();
  const queryClient = useQueryClient();
  const targetDrive = getTargetDriveFromCommunityId(communityId || '');

  const [messagesQueue, setMessagesQueue] = useState<HomebaseFile<CommunityMessage>[]>([]);

  const handler = useCallback(async (notification: TypedConnectionNotification) => {
    if (!communityId) return;
    isDebug && console.debug('[CommunityWebsocket] Got notification', notification);

    if (
      (notification.notificationType === 'fileAdded' ||
        notification.notificationType === 'fileModified') &&
      drivesEqual(notification.targetDrive, targetDrive)
    ) {
      if (notification.header.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE) {
        const channelId = notification.header.fileMetadata.appData.groupId;

        // This skips the invalidation of all chat messages, as we only need to add/update this specific message
        const updatedChatMessage = await dsrToMessage(
          dotYouClient,
          notification.header,
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

        if (updatedChatMessage.fileMetadata.senderOdinId !== identity) {
          // Messages from others are processed immediately
          insertNewMessage(queryClient, updatedChatMessage, communityId);
        } else {
          setMessagesQueue((prev) => [...prev, updatedChatMessage]);
        }
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
          return;
        }
        insertNewCommunityChannel(queryClient, communityChannel, communityId);
      }

      // Needs to be handled on the local drive
      // if (
      //   notification.header.fileMetadata.appData.fileType === COMMUNITY_METADATA_FILE_TYPE
      // ) {
      //   const communityChannel = await dsrToCommunityMetadata(
      //     dotYouClient,
      //     notification.header,
      //     targetDrive,
      //     true
      //   );
      //   if (!communityChannel) {
      //     console.warn('[CommunityWebsocket] Invalid channel received', notification);
      //     return;
      //   }
      //   insertNewcommunityMetadata(queryClient, communityChannel);
      // }
    }

    if (
      notification.notificationType === 'fileDeleted' &&
      drivesEqual(notification.targetDrive, targetDrive)
    ) {
      if (notification.header.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE) {
        const threadOrChannelId = notification.header.fileMetadata.appData.groupId;
        queryClient.invalidateQueries({
          queryKey: ['community-messages', formatGuidId(threadOrChannelId)],
        });
      } else if (
        notification.header.fileMetadata.appData.fileType === COMMUNITY_CHANNEL_FILE_TYPE
      ) {
        queryClient.invalidateQueries({
          queryKey: ['community-channels'],
        });
      }
    }

    if (notification.notificationType === 'appNotificationAdded') {
      const clientNotification = notification as AppNotification;

      insertNewNotification(queryClient, clientNotification);
      incrementAppIdNotificationCount(queryClient, clientNotification.options.appId);
    }
  }, []);

  const messagesQueueTunnel = useRef<HomebaseFile<CommunityMessage>[]>([]);
  const processQueue = useCallback(async (queuedMessages: HomebaseFile<CommunityMessage>[]) => {
    if (!communityId) return;
    isDebug && console.debug('[CommunityWebsocket] Processing queue', queuedMessages.length);
    setMessagesQueue([]);
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }

    const queuedMessagesWithLastUpdated = queuedMessages.map((m) => ({
      ...m,
      fileMetadata: {
        ...m.fileMetadata,
        updated:
          Object.values(m.serverMetadata?.transferHistory?.recipients || []).reduce((acc, cur) => {
            return Math.max(acc, cur.lastUpdated || 0);
          }, 0) ||
          m.fileMetadata.updated ||
          0,
      },
    }));

    // Filter out duplicate messages and selec the one with the latest updated property
    const filteredMessages = queuedMessagesWithLastUpdated.reduce((acc, message) => {
      const existingMessage = acc.find((m) => stringGuidsEqual(m.fileId, message.fileId));
      if (!existingMessage) {
        acc.push(message);
      } else if (existingMessage.fileMetadata.updated < message.fileMetadata.updated) {
        acc[acc.indexOf(existingMessage)] = message;
      }
      return acc;
    }, [] as HomebaseFile<CommunityMessage>[]);

    await processCommunityMessagesBatch(
      dotYouClient,
      queryClient,
      targetDrive,
      communityId,
      filteredMessages
    );
  }, []);

  const timeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Using a ref as it's part of the global closure so we can easily pass the latest queue into the timeout
    messagesQueueTunnel.current = [...messagesQueue];

    if (messagesQueue.length >= 1) {
      if (!timeout.current) {
        // Start timeout to always process the queue after a certain time
        timeout.current = setTimeout(() => processQueue(messagesQueueTunnel.current), 500);
      }
    }

    if (messagesQueue.length > 25) {
      processQueue(messagesQueue);
    }
  }, [processQueue, messagesQueue]);

  if (!odinId || odinId === dotYouClient.getIdentity()) {
    return useWebsocketSubscriber(
      isEnabled ? handler : undefined,
      ['fileAdded', 'fileModified', 'fileDeleted'],
      [targetDrive],
      () => {
        queryClient.invalidateQueries({ queryKey: ['process-inbox'] });
      },
      undefined,
      'useLiveCommunityProcessor'
    );
  } else {
    return useWebsocketSubscriberOverPeer(
      isEnabled ? handler : undefined,
      odinId,
      ['fileAdded', 'fileModified', 'fileDeleted'],
      [targetDrive],
      () => {
        queryClient.invalidateQueries({ queryKey: ['process-inbox'] });
      },
      undefined,
      'useLiveCommunityProcessor'
    );
  }
};

// Process batched updates after a processInbox
const processCommunityMessagesBatch = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  targetDrive: TargetDrive,
  communityId: string,
  communityMessages: (HomebaseFile<string | CommunityMessage> | DeletedHomebaseFile<string>)[]
) => {
  const uniqueMessagesPerChannel = communityMessages.reduce(
    (acc, dsr) => {
      if (!dsr.fileMetadata?.appData?.groupId || dsr.fileState === 'deleted') {
        return acc;
      }
      [...(dsr.fileMetadata.appData.tags || []), 'any'].forEach((tag) => {
        if (!acc[tag]) {
          acc[tag] = [];
        }

        if (acc[tag].some((m) => stringGuidsEqual(m.fileId, dsr.fileId))) {
          return acc;
        }

        acc[tag].push(dsr);
      });

      return acc;
    },
    {} as Record<string, HomebaseFile<string | CommunityMessage>[]>
  );
  isDebug &&
    console.debug(
      '[InboxProcessor] new conversation updates',
      Object.keys(uniqueMessagesPerChannel).length
    );

  await Promise.all(
    Object.keys(uniqueMessagesPerChannel).map(async (channelId) => {
      const updatedcommunityMessages = (
        await Promise.all(
          uniqueMessagesPerChannel[channelId].map(async (newMessage) =>
            typeof newMessage.fileMetadata.appData.content === 'string'
              ? await dsrToMessage(
                  dotYouClient,
                  newMessage as HomebaseFile<string>,
                  targetDrive,
                  true
                )
              : (newMessage as HomebaseFile<CommunityMessage>)
          )
        )
      ).filter(Boolean) as (HomebaseFile<CommunityMessage> | DeletedHomebaseFile)[];
      const threadMessages = updatedcommunityMessages.filter(
        (msg) => !stringGuidsEqual(msg.fileMetadata.appData.groupId, communityId)
      );
      threadMessages.forEach((msg) => {
        insertNewMessage(queryClient, msg, communityId);
      });

      insertNewMessagesForChannel(
        queryClient,
        channelId,
        updatedcommunityMessages.filter((msg) =>
          stringGuidsEqual(msg.fileMetadata.appData.groupId, communityId)
        )
      );
    })
  );
};

const findChangesSinceTimestamp = async (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  timeStamp: number,
  params: FileQueryParams
) => {
  const modifiedCursor = getQueryModifiedCursorFromTime(timeStamp); // Friday, 31 May 2024 09:38:54.678
  const batchCursor = getQueryBatchCursorFromTime(new Date().getTime(), timeStamp);

  const newFiles =
    odinId && dotYouClient.getIdentity() !== odinId
      ? await queryBatchOverPeer(dotYouClient, odinId, params, {
          maxRecords: BATCH_SIZE,
          cursorState: batchCursor,
          includeMetadataHeader: true,
          includeTransferHistory: true,
        })
      : await queryBatch(dotYouClient, params, {
          maxRecords: BATCH_SIZE,
          cursorState: batchCursor,
          includeMetadataHeader: true,
          includeTransferHistory: true,
        });

  const modifiedFiles =
    odinId && dotYouClient.getIdentity() !== odinId
      ? await queryModifiedOverPeer(dotYouClient, odinId, params, {
          maxRecords: BATCH_SIZE,
          cursor: modifiedCursor,
          excludePreviewThumbnail: false,
          includeHeaderContent: true,
          includeTransferHistory: true,
        })
      : await queryModified(dotYouClient, params, {
          maxRecords: BATCH_SIZE,
          cursor: modifiedCursor,
          excludePreviewThumbnail: false,
          includeHeaderContent: true,
          includeTransferHistory: true,
        });

  return modifiedFiles.searchResults.concat(newFiles.searchResults);
};
