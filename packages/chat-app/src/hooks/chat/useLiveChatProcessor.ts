import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TypedConnectionNotification, queryBatch, queryModified } from '@youfoundation/js-lib/core';

import { processInbox } from '@youfoundation/js-lib/peer';
import {
  ChatDrive,
  CHAT_CONVERSATION_FILE_TYPE,
  GROUP_CHAT_CONVERSATION_FILE_TYPE,
  dsrToConversation,
} from '../../providers/ConversationProvider';
import { useNotificationSubscriber } from '@youfoundation/common-app';
import { useCallback } from 'react';
import { CHAT_MESSAGE_FILE_TYPE, dsrToMessage } from '../../providers/ChatProvider';
import {
  getQueryBatchCursorFromTime,
  getQueryModifiedCursorFromTime,
  hasDebugFlag,
  stringGuidsEqual,
} from '@youfoundation/js-lib/helpers';
import { getConversationQueryOptions, useConversation } from './useConversation';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { ChatReactionFileType } from '../../providers/ChatReactionProvider';
import { insertNewMessage } from './useChatMessages';
import { insertNewConversation } from './useConversations';

const MINUTE_IN_MS = 60000;

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
    const lastProcessedWithBuffer = lastProcessedTime && lastProcessedTime - MINUTE_IN_MS * 5;

    const processedresult = await processInbox(dotYouClient, ChatDrive, BATCH_SIZE);

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
        },
        {
          maxRecords: BATCH_SIZE,
          cursorState: batchCursor,
          includeMetadataHeader: true,
        }
      );

      const modifieData = await queryModified(
        dotYouClient,
        {
          targetDrive: ChatDrive,
        },
        {
          maxRecords: BATCH_SIZE,
          cursor: modifiedCursor,
          excludePreviewThumbnail: false,
          includeHeaderContent: true,
          includeTransferHistory: true,
        }
      );

      const newMessages = [...newData.searchResults, ...modifieData.searchResults].filter(
        (dsr) => dsr.fileMetadata.appData.fileType === CHAT_MESSAGE_FILE_TYPE
      );

      await Promise.all(
        newMessages.map(async (newMessage) => {
          if (newMessage.fileState === 'deleted') return;

          const newChatMessage = await dsrToMessage(dotYouClient, newMessage, ChatDrive, true);
          if (!newChatMessage) return;
          insertNewMessage(queryClient, newChatMessage);
        })
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
    enabled: connected,
  });
};

const isDebug = hasDebugFlag();

const useChatWebsocket = (isEnabled: boolean) => {
  const dotYouClient = useDotYouClientContext();

  // Added to ensure we have the conversation query available
  const {
    restoreChat: { mutate: restoreChat },
  } = useConversation();
  const queryClient = useQueryClient();

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
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
          return;
        }

        insertNewMessage(queryClient, updatedChatMessage, !isNewFile);
      } else if (notification.header.fileMetadata.appData.fileType === ChatReactionFileType) {
        const messageId = notification.header.fileMetadata.appData.groupId;
        queryClient.invalidateQueries({ queryKey: ['chat-reaction', messageId] });
      } else if (
        notification.header.fileMetadata.appData.fileType === CHAT_CONVERSATION_FILE_TYPE ||
        notification.header.fileMetadata.appData.fileType === GROUP_CHAT_CONVERSATION_FILE_TYPE
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
      }
    }
  }, []);

  return useNotificationSubscriber(
    isEnabled ? handler : undefined,
    ['fileAdded', 'fileModified'],
    [ChatDrive],
    () => {
      queryClient.invalidateQueries({ queryKey: ['process-inbox'] });
    }
  );
};
