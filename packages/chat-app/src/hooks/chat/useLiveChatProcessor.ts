import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AppNotification,
  DeletedHomebaseFile,
  DotYouClient,
  HomebaseFile,
  PushNotification,
  ReactionNotification,
  TypedConnectionNotification,
  queryBatch,
  queryModified,
} from '@youfoundation/js-lib/core';

import { processInbox } from '@youfoundation/js-lib/peer';
import {
  ChatDrive,
  CHAT_CONVERSATION_FILE_TYPE,
  dsrToConversation,
  CHAT_CONVERSATION_LOCAL_METADATA_FILE_TYPE,
  dsrToConversationMetadata,
} from '../../providers/ConversationProvider';
import {
  incrementAppIdNotificationCount,
  useDotYouClientContext,
  useNotificationSubscriber,
} from '@youfoundation/common-app';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_MESSAGE_FILE_TYPE, ChatMessage, dsrToMessage } from '../../providers/ChatProvider';
import {
  getQueryBatchCursorFromTime,
  getQueryModifiedCursorFromTime,
  hasDebugFlag,
  stringGuidsEqual,
} from '@youfoundation/js-lib/helpers';
import { getConversationQueryOptions, useConversation } from './useConversation';

import { insertNewMessage, insertNewMessagesForConversation } from './useChatMessages';
import { insertNewConversation } from './useConversations';
import { insertNewReaction } from './useChatReaction';
import { insertNewConversationMetadata } from './useConversationMetadata';

const MINUTE_IN_MS = 60000;
const isDebug = hasDebugFlag();

// We first process the inbox, then we connect for live updates;
export const useLiveChatProcessor = () => {
  // Process the inbox on startup; As we want to cover the backlog of messages first
  const { status: inboxStatus } = useInboxProcessor(true);

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useChatWebsocket(inboxStatus === 'success');

  return isOnline;
};

const BATCH_SIZE = 2000;
// Process the inbox on startup
const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchData = async () => {
    const lastProcessedTime = queryClient.getQueryState(['process-inbox'])?.dataUpdatedAt;
    const lastProcessedWithBuffer = lastProcessedTime && lastProcessedTime - MINUTE_IN_MS * 2;

    const processedresult = await processInbox(dotYouClient, ChatDrive, BATCH_SIZE);

    isDebug && console.debug('[InboxProcessor] fetching updates since', lastProcessedWithBuffer);
    if (lastProcessedWithBuffer) {
      const modifiedCursor = getQueryModifiedCursorFromTime(lastProcessedWithBuffer); // Friday, 31 May 2024 09:38:54.678
      const batchCursor = getQueryBatchCursorFromTime(
        new Date().getTime(),
        lastProcessedWithBuffer
      );

      const newData = await queryBatch(
        dotYouClient,
        {
          targetDrive: ChatDrive,
          fileType: [CHAT_MESSAGE_FILE_TYPE],
        },
        {
          maxRecords: BATCH_SIZE,
          cursorState: batchCursor,
          includeMetadataHeader: true,
          includeTransferHistory: true,
        }
      );

      const modifieData = await queryModified(
        dotYouClient,
        {
          targetDrive: ChatDrive,
          fileType: [CHAT_MESSAGE_FILE_TYPE],
        },
        {
          maxRecords: BATCH_SIZE,
          cursor: modifiedCursor,
          excludePreviewThumbnail: false,
          includeHeaderContent: true,
          includeTransferHistory: true,
        }
      );

      const newMessages = modifieData.searchResults.concat(newData.searchResults);
      isDebug && console.debug('[InboxProcessor] new messages', newMessages.length);
      await processChatMessagesBatch(dotYouClient, queryClient, newMessages);
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
    enabled: connected,
    staleTime: 500, // 500ms
  });
};

const useChatWebsocket = (isEnabled: boolean) => {
  const dotYouClient = useDotYouClientContext();

  // Added to ensure we have the conversation query available
  const {
    restoreChat: { mutate: restoreChat },
  } = useConversation();
  const queryClient = useQueryClient();

  const [chatMessagesQueue, setChatMessagesQueue] = useState<HomebaseFile<ChatMessage>[]>([]);

  const handler = useCallback(async (notification: TypedConnectionNotification) => {
    isDebug && console.debug('[ChatWebsocket] Got notification', notification);

    if (
      (notification.notificationType === 'fileAdded' ||
        notification.notificationType === 'fileModified') &&
      stringGuidsEqual(notification.targetDrive?.alias, ChatDrive.alias) &&
      stringGuidsEqual(notification.targetDrive?.type, ChatDrive.type)
    ) {
      if (notification.header.fileMetadata.appData.fileType === CHAT_MESSAGE_FILE_TYPE) {
        const conversationId = notification.header.fileMetadata.appData.groupId;
        const isNewFile = notification.notificationType === 'fileAdded';

        if (isNewFile) {
          // Check if the message is orphaned from a conversation
          const conversation = await queryClient.fetchQuery(
            getConversationQueryOptions(dotYouClient, queryClient, conversationId)
          );

          if (!conversation) {
            console.error('Orphaned message received', notification.header.fileId, conversation);
            // Can't handle this one ATM.. How to resolve?
          } else if (conversation.fileMetadata.appData.archivalStatus === 2) {
            restoreChat({ conversation });
          }
        }

        // This skips the invalidation of all chat messages, as we only need to add/update this specific message
        const updatedChatMessage = await dsrToMessage(
          dotYouClient,
          notification.header,
          ChatDrive,
          true
        );
        if (
          !updatedChatMessage ||
          Object.keys(updatedChatMessage.fileMetadata.appData.content).length === 0
        ) {
          // Something is up with the message, invalidate all messages for this conversation
          console.warn('[ChatWebsocket] Invalid message received', notification, conversationId);
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
          return;
        }

        if (updatedChatMessage.fileMetadata.senderOdinId !== '') {
          // Messages from others are processed immediately
          insertNewMessage(queryClient, updatedChatMessage);
        } else {
          setChatMessagesQueue((prev) => [...prev, updatedChatMessage]);
        }
      } else if (
        notification.header.fileMetadata.appData.fileType === CHAT_CONVERSATION_FILE_TYPE
      ) {
        const isNewFile = notification.notificationType === 'fileAdded';

        const updatedConversation = await dsrToConversation(
          dotYouClient,
          notification.header,
          ChatDrive,
          true
        );

        if (
          !updatedConversation ||
          Object.keys(updatedConversation.fileMetadata.appData.content).length === 0
        ) {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          return;
        }

        insertNewConversation(queryClient, updatedConversation, !isNewFile);
      } else if (
        notification.header.fileMetadata.appData.fileType ===
        CHAT_CONVERSATION_LOCAL_METADATA_FILE_TYPE
      ) {
        const updatedMetadata = await dsrToConversationMetadata(
          dotYouClient,
          notification.header,
          ChatDrive,
          true
        );

        if (!updatedMetadata) return;

        insertNewConversationMetadata(queryClient, updatedMetadata);
      }
    }

    if (notification.notificationType === 'appNotificationAdded') {
      const clientNotification = notification as AppNotification;

      const existingNotificationData = queryClient.getQueryData<{
        results: PushNotification[];
        cursor: number;
      }>(['push-notifications']);

      if (existingNotificationData) {
        const newNotificationData = {
          ...existingNotificationData,
          results: [
            clientNotification,
            ...existingNotificationData.results.filter(
              (notification) =>
                !stringGuidsEqual(notification.options.tagId, clientNotification.options.tagId)
            ),
          ],
        };
        queryClient.setQueryData(['push-notifications'], newNotificationData);
      }
      incrementAppIdNotificationCount(queryClient, clientNotification.options.appId);
    }

    if (
      notification.notificationType === 'reactionContentAdded' ||
      notification.notificationType === 'reactionContentDeleted'
    ) {
      if (notification.notificationType === 'reactionContentAdded') {
        insertNewReaction(
          queryClient,
          notification.fileId.fileId,
          notification as ReactionNotification
        );
      } else {
        // TODO: the server currently doesn't send a 'reactionContentDeleted' notification; But we want to handle it directly without refetching the data
        queryClient.invalidateQueries({ queryKey: ['chat-reaction', notification.fileId.fileId] });
      }
    }
  }, []);

  const chatMessagesQueueTunnel = useRef<HomebaseFile<ChatMessage>[]>([]);
  const processQueue = useCallback(async (queuedMessages: HomebaseFile<ChatMessage>[]) => {
    isDebug && console.debug('[ChatWebsocket] Processing queue', queuedMessages.length);
    setChatMessagesQueue([]);
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }

    // Filter out duplicate messages and selec the one with the latest updated property
    const filteredMessages = queuedMessages.reduce((acc, message) => {
      const existingMessage = acc.find((m) => stringGuidsEqual(m.fileId, message.fileId));
      if (!existingMessage) {
        acc.push(message);
      } else if (existingMessage.fileMetadata.updated < message.fileMetadata.updated) {
        acc[acc.indexOf(existingMessage)] = message;
      }
      return acc;
    }, [] as HomebaseFile<ChatMessage>[]);

    await processChatMessagesBatch(dotYouClient, queryClient, filteredMessages);
  }, []);

  const timeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Using a ref as it's part of the global closure so we can easily pass the latest queue into the timeout
    chatMessagesQueueTunnel.current = [...chatMessagesQueue];

    if (chatMessagesQueue.length >= 1) {
      if (!timeout.current) {
        // Start timeout to always process the queue after a certain time
        timeout.current = setTimeout(() => processQueue(chatMessagesQueueTunnel.current), 700);
      }
    }

    if (chatMessagesQueue.length > 25) {
      processQueue(chatMessagesQueue);
    }
  }, [processQueue, chatMessagesQueue]);

  return useNotificationSubscriber(
    isEnabled ? handler : undefined,
    [
      'fileAdded',
      'fileModified',
      'reactionContentAdded',
      'reactionContentDeleted',
      'appNotificationAdded',
    ],
    [ChatDrive],
    () => {
      queryClient.invalidateQueries({ queryKey: ['process-inbox'] });
    }
  );
};

const processChatMessagesBatch = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  chatMessages: (HomebaseFile<string | ChatMessage> | DeletedHomebaseFile<string>)[]
) => {
  const uniqueMessagesPerConversation = chatMessages.reduce(
    (acc, dsr) => {
      if (!dsr.fileMetadata?.appData?.groupId || dsr.fileState === 'deleted') {
        return acc;
      }

      const conversationId = dsr.fileMetadata?.appData.groupId as string;
      if (!acc[conversationId]) {
        acc[conversationId] = [];
      }

      if (acc[conversationId].some((m) => stringGuidsEqual(m.fileId, dsr.fileId))) {
        return acc;
      }

      acc[conversationId].push(dsr);
      return acc;
    },
    {} as Record<string, HomebaseFile<string | ChatMessage>[]>
  );
  isDebug &&
    console.debug(
      '[InboxProcessor] new conversation updates',
      Object.keys(uniqueMessagesPerConversation).length
    );

  await Promise.all(
    Object.keys(uniqueMessagesPerConversation).map(async (updatedConversation) => {
      const updatedChatMessages = (
        await Promise.all(
          uniqueMessagesPerConversation[updatedConversation].map(async (newMessage) =>
            typeof newMessage.fileMetadata.appData.content === 'string'
              ? await dsrToMessage(
                  dotYouClient,
                  newMessage as HomebaseFile<string>,
                  ChatDrive,
                  true
                )
              : (newMessage as HomebaseFile<ChatMessage>)
          )
        )
      ).filter(Boolean) as HomebaseFile<ChatMessage>[];
      insertNewMessagesForConversation(queryClient, updatedConversation, updatedChatMessages);
    })
  );
};
