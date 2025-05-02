import {
  useOdinClientContext,
  insertNewNotification,
  incrementAppIdNotificationCount,
  useWebsocketSubscriber,
} from '@homebase-id/common-app';
import {
  HomebaseFile,
  OdinClient,
  TypedConnectionNotification,
  AppNotification,
  ReactionNotification,
  DeletedHomebaseFile,
} from '@homebase-id/js-lib/core';
import { hasDebugFlag, drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, CHAT_MESSAGE_FILE_TYPE, dsrToMessage } from '../../../providers/ChatProvider';
import {
  ChatDrive,
  CHAT_CONVERSATION_FILE_TYPE,
  dsrToConversation,
} from '../../../providers/ConversationProvider';
import { websocketDrives } from '../../auth/useAuth';
import {
  insertNewMessage,
  insertNewMessagesForConversation,
  invalidateChatMessages,
} from '../useChatMessages';
import { insertNewReaction, removeReaction } from '../useChatReaction';
import { getConversationQueryOptions, restoreChat, useConversation } from '../useConversation';
import { insertNewConversation, invalidateConversations } from '../useConversations';

const isDebug = hasDebugFlag();

export const useChatWebsocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();
  const { chatHandler } = useChatSocketHandler();

  return useWebsocketSubscriber(
    isEnabled ? chatHandler : undefined,
    undefined,
    [
      'fileAdded',
      'fileModified',
      'fileDeleted',
      'reactionContentAdded',
      'reactionContentDeleted',
      'statisticsChanged',
      'appNotificationAdded',
    ],
    websocketDrives,
    () => queryClient.invalidateQueries({ queryKey: ['process-chat-inbox'] }),
    () => queryClient.invalidateQueries({ queryKey: ['process-chat-inbox'] }),
    'useLiveChatProcessor'
  );
};

export const useChatSocketHandler = () => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const identity = odinClient.getHostIdentity();

  // Added to ensure we have the conversation query available
  const {
    restoreChat: { mutate: restoreChat },
  } = useConversation();

  const [chatMessagesQueue, setChatMessagesQueue] = useState<HomebaseFile<ChatMessage>[]>([]);

  const chatHandler = useCallback(
    async (_: OdinClient, notification: TypedConnectionNotification) => {
      isDebug && console.debug('[ChatWebsocket] Got notification', notification);

      if (
        (notification.notificationType === 'fileAdded' ||
          notification.notificationType === 'fileModified' ||
          notification.notificationType === 'statisticsChanged') &&
        drivesEqual(notification.targetDrive, ChatDrive)
      ) {
        if (notification.header.fileMetadata.appData.fileType === CHAT_MESSAGE_FILE_TYPE) {
          const conversationId = notification.header.fileMetadata.appData.groupId as string;
          const isNewMessageFile = notification.notificationType === 'fileAdded';

          if (isNewMessageFile) {
            // Check if the message is orphaned from a conversation
            const conversation = await queryClient.fetchQuery(
              getConversationQueryOptions(odinClient, queryClient, conversationId)
            );

            if (!conversation) {
              console.error('Orphaned message received', notification.header.fileId, conversation);
              // Can't handle this one ATM.. How to resolve?
            } else if (
              conversation.fileMetadata.appData.archivalStatus === 2 ||
              conversation.fileMetadata.appData.archivalStatus === 3
            ) {
              restoreChat({ conversation });
            }
          }

          // This skips the invalidation of all chat messages, as we only need to add/update this specific message
          const updatedChatMessage = await dsrToMessage(
            odinClient,
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
            invalidateChatMessages(queryClient, conversationId);
            return;
          }

          if (updatedChatMessage.fileMetadata.senderOdinId !== identity) {
            // Messages from others are processed immediately
            insertNewMessage(queryClient, updatedChatMessage);
          } else {
            setChatMessagesQueue((prev) => [...prev, updatedChatMessage]);
          }
        } else if (
          notification.header.fileMetadata.appData.fileType === CHAT_CONVERSATION_FILE_TYPE
        ) {
          const isNewConversationFile = notification.notificationType === 'fileAdded';
          const updatedConversation = await dsrToConversation(
            odinClient,
            notification.header,
            ChatDrive,
            true
          );

          if (
            !updatedConversation ||
            Object.keys(updatedConversation.fileMetadata.appData.content).length === 0
          ) {
            invalidateConversations(queryClient);
            return;
          }

          insertNewConversation(queryClient, updatedConversation, !isNewConversationFile);
        }
      }

      if (
        notification.notificationType === `fileDeleted` &&
        drivesEqual(notification.targetDrive, ChatDrive)
      ) {
        if (notification.header.fileMetadata.appData.fileType === CHAT_MESSAGE_FILE_TYPE) {
          const conversationId = notification.header.fileMetadata.appData.groupId as string;
          invalidateChatMessages(queryClient, conversationId);
        }
        if (notification.header.fileMetadata.appData.fileType === CHAT_CONVERSATION_FILE_TYPE) {
          invalidateConversations(queryClient);
        }
      }

      if (notification.notificationType === 'appNotificationAdded') {
        const clientNotification = notification as AppNotification;

        insertNewNotification(queryClient, clientNotification);
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
        } else if (notification.notificationType === 'reactionContentDeleted') {
          removeReaction(
            queryClient,
            notification.fileId.fileId,
            notification as ReactionNotification
          );
        }
      }
    },
    []
  );

  const chatMessagesQueueTunnel = useRef<HomebaseFile<ChatMessage>[]>([]);
  const processQueue = useCallback(async (queuedMessages: HomebaseFile<ChatMessage>[]) => {
    isDebug && console.debug('[ChatWebsocket] Processing queue', queuedMessages.length);
    setChatMessagesQueue([]);
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }

    const queuedMessagesWithLastUpdated = queuedMessages.map((m) => ({
      ...m,
      fileMetadata: {
        ...m.fileMetadata,
        // updated:
        //   Object.values(m.serverMetadata?.transferHistory?.recipients || []).reduce((acc, cur) => {
        //     return Math.max(acc, cur.lastUpdated || 0);
        //   }, 0) ||
        //   m.fileMetadata.updated ||
        //   0,
        // TODO: Find a way to use the most up to date transfer history
        updated: m.fileMetadata.updated || 0,
      },
    }));

    // Filter out duplicate messages and select the one with the latest updated property
    const filteredMessages = queuedMessagesWithLastUpdated.reduce((acc, message) => {
      const existingMessage = acc.find((m) => stringGuidsEqual(m.fileId, message.fileId));
      if (!existingMessage) {
        acc.push(message);
      } else if (existingMessage.fileMetadata.updated < message.fileMetadata.updated) {
        acc[acc.indexOf(existingMessage)] = message;
      }
      return acc;
    }, [] as HomebaseFile<ChatMessage>[]);

    await processChatMessagesBatch(odinClient, queryClient, filteredMessages);
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

  return { chatHandler };
};

export const processChatMessagesBatch = async (
  odinClient: OdinClient,
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
    Object.keys(uniqueMessagesPerConversation).map(async (conversationId) => {
      const updatedChatMessages = (
        await Promise.all(
          uniqueMessagesPerConversation[conversationId].map(async (newMessage) =>
            typeof newMessage.fileMetadata.appData.content === 'string'
              ? await dsrToMessage(
                odinClient,
                newMessage as HomebaseFile<string>,
                ChatDrive,
                true
              )
              : (newMessage as HomebaseFile<ChatMessage>)
          )
        )
      ).filter(Boolean) as HomebaseFile<ChatMessage>[];
      insertNewMessagesForConversation(queryClient, conversationId, updatedChatMessages);

      // Check if the message is orphaned from a conversation
      const conversation = await queryClient.fetchQuery(
        getConversationQueryOptions(odinClient, queryClient, conversationId)
      );
      if (
        conversation &&
        (conversation.fileMetadata.appData.archivalStatus === 2 ||
          conversation.fileMetadata.appData.archivalStatus === 3)
      ) {
        restoreChat(odinClient, conversation);
      }
    })
  );
};
