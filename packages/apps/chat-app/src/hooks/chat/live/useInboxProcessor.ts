import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  HomebaseFile,
  DotYouClient,
  FileQueryParams,
  queryBatch,
  queryModified,
  DeletedHomebaseFile,
} from '@homebase-id/js-lib/core';
import {
  getQueryModifiedCursorFromTime,
  getQueryBatchCursorFromTime,
  hasDebugFlag,
} from '@homebase-id/js-lib/helpers';
import { processInbox } from '@homebase-id/js-lib/peer';
import { useQueryClient, useQuery, QueryClient } from '@tanstack/react-query';
import { CHAT_MESSAGE_FILE_TYPE, dsrToMessage, ChatMessage } from '../../../providers/ChatProvider';
import {
  ChatDrive,
  CHAT_CONVERSATION_FILE_TYPE,
  CHAT_CONVERSATION_LOCAL_METADATA_FILE_TYPE,
  dsrToConversation,
  dsrToConversationMetadata,
} from '../../../providers/ConversationProvider';
import { insertNewConversationMetadata } from '../useConversationMetadata';
import { insertNewConversation } from '../useConversations';
import { processChatMessagesBatch } from './useChatWebsocket';
import { useCallback } from 'react';

const isDebug = hasDebugFlag();

const MINUTE_IN_MS = 60000;
const BATCH_SIZE = 2000;
// Process the inbox on startup
export const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const chatPostProcessInboxHandler = useChatPostInboxHandler();

  const fetchData = async () => {
    const lastProcessedTime = queryClient.getQueryState(['process-inbox'])?.dataUpdatedAt;
    const lastProcessedWithBuffer = lastProcessedTime && lastProcessedTime - MINUTE_IN_MS * 5;

    const processedresult = await processInbox(dotYouClient, ChatDrive, BATCH_SIZE);

    await chatPostProcessInboxHandler(lastProcessedWithBuffer);

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

export const useChatPostInboxHandler = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const handler = useCallback(
    async (lastProcessedWithBuffer: number | undefined) => {
      isDebug && console.debug('[InboxProcessor] fetching updates since', lastProcessedWithBuffer);
      if (lastProcessedWithBuffer) {
        const updatedMessages = await findChangesSinceTimestamp(
          dotYouClient,
          lastProcessedWithBuffer,
          {
            targetDrive: ChatDrive,
            fileType: [CHAT_MESSAGE_FILE_TYPE],
          }
        );
        isDebug && console.debug('[InboxProcessor] new messages', updatedMessages.length);
        if (updatedMessages.length > 0) {
          const fullMessages = (
            await Promise.all(
              updatedMessages.map(
                async (msg) =>
                  await dsrToMessage(
                    dotYouClient,
                    msg as unknown as HomebaseFile<string>,
                    ChatDrive,
                    false
                  )
              )
            )
          ).filter(Boolean) as HomebaseFile<ChatMessage>[];
          await processChatMessagesBatch(dotYouClient, queryClient, fullMessages);
        }

        const updatedConversations = await findChangesSinceTimestamp(
          dotYouClient,
          lastProcessedWithBuffer,
          {
            targetDrive: ChatDrive,
            fileType: [CHAT_CONVERSATION_FILE_TYPE],
          }
        );
        isDebug && console.debug('[InboxProcessor] new conversations', updatedConversations.length);
        await processConversationsBatch(dotYouClient, queryClient, updatedConversations);

        const updatedConversationMetadatas = await findChangesSinceTimestamp(
          dotYouClient,
          lastProcessedWithBuffer,
          {
            targetDrive: ChatDrive,
            fileType: [CHAT_CONVERSATION_LOCAL_METADATA_FILE_TYPE],
          }
        );
        isDebug &&
          console.debug('[InboxProcessor] new metadata', updatedConversationMetadatas.length);
        await processConversationsMetadataBatch(
          dotYouClient,
          queryClient,
          updatedConversationMetadatas
        );
      } else {
        // We have no reference to the last time we processed the inbox, so we can only invalidate all chat messages
        queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['conversation-metadata'], exact: false });
      }
    },
    [dotYouClient, queryClient]
  );

  return handler;
};

const findChangesSinceTimestamp = async (
  dotYouClient: DotYouClient,
  timeStamp: number,
  params: FileQueryParams
) => {
  const modifiedCursor = getQueryModifiedCursorFromTime(timeStamp); // Friday, 31 May 2024 09:38:54.678
  const batchCursor = getQueryBatchCursorFromTime(new Date().getTime(), timeStamp);

  const newFiles = await queryBatch(dotYouClient, params, {
    maxRecords: BATCH_SIZE,
    cursorState: batchCursor,
    includeMetadataHeader: true,
    includeTransferHistory: true,
  });

  const modifiedFiles = await queryModified(dotYouClient, params, {
    maxRecords: BATCH_SIZE,
    cursor: modifiedCursor,
    excludePreviewThumbnail: false,
    includeHeaderContent: true,
    includeTransferHistory: true,
  });

  return modifiedFiles.searchResults.concat(newFiles.searchResults);
};

const processConversationsBatch = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  conversations: (HomebaseFile<string> | DeletedHomebaseFile<string>)[]
) => {
  await Promise.all(
    conversations.map(async (conversationsDsr) => {
      if (conversationsDsr.fileState === 'deleted') {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        return;
      }

      const updatedConversation = await dsrToConversation(
        dotYouClient,
        conversationsDsr,
        ChatDrive,
        true
      );

      if (!updatedConversation) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        return;
      }

      insertNewConversation(queryClient, updatedConversation);
    })
  );
};

const processConversationsMetadataBatch = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  conversations: (HomebaseFile<string> | DeletedHomebaseFile<string>)[]
) => {
  await Promise.all(
    conversations.map(async (conversationsDsr) => {
      if (conversationsDsr.fileState === 'deleted') {
        queryClient.invalidateQueries({ queryKey: ['conversation-metadata'], exact: false });
        return;
      }

      const updatedMetadata = await dsrToConversationMetadata(
        dotYouClient,
        conversationsDsr,
        ChatDrive,
        true
      );

      if (!updatedMetadata) {
        queryClient.invalidateQueries({ queryKey: ['conversation-metadata'], exact: false });
        return;
      }

      insertNewConversationMetadata(queryClient, updatedMetadata);
    })
  );
};