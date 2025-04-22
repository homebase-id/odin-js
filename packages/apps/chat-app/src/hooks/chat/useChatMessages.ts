import {
  InfiniteData,
  QueryClient,
  UndefinedInitialDataInfiniteOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ChatMessage,
  getChatMessages,
  hardDeleteChatMessage,
  requestMarkAsRead,
  softDeleteChatMessage,
} from '../../providers/ChatProvider';
import { OdinClient, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';

import {
  ConversationMetadata,
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../providers/ConversationProvider';
import { formatGuidId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { SendReadReceiptResponseRecipientStatus } from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '@homebase-id/common-app';
import { updateCacheChatMessage } from './useChatMessage';

const FIRST_PAGE_SIZE = 30;
const PAGE_SIZE = 100;
export const useChatMessages = (props?: { conversationId: string | undefined }) => {
  const { conversationId } = props || { conversationId: undefined };
  const odinClient = useOdinClientContext();

  const queryClient = useQueryClient();

  const markAsRead = async ({
    conversation,
    messages,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    messages: HomebaseFile<ChatMessage>[];
  }) => {
    const response = await requestMarkAsRead(odinClient, conversation, messages);

    response.results.forEach((result) => {
      const someFailed = result.status.some(
        (recipientStatus) =>
          !recipientStatus.status ||
          recipientStatus.status?.toLowerCase() !== SendReadReceiptResponseRecipientStatus.Enqueued
      );
      if (someFailed) console.error('Error marking chat as read', { response });
    });

    return response;
  };

  const removeMessage = async ({
    conversation,
    messages,
    deleteForEveryone,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    messages: HomebaseFile<ChatMessage>[];
    deleteForEveryone?: boolean;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = odinClient.getHostIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    const hardDelete = stringGuidsEqual(
      conversation?.fileMetadata.appData.uniqueId,
      ConversationWithYourselfId
    );

    return await Promise.all(
      messages.map(async (msg) =>
        hardDelete
          ? await hardDeleteChatMessage(odinClient, msg)
          : await softDeleteChatMessage(
            odinClient,
            msg,
            recipients.filter(Boolean),
            deleteForEveryone
          )
      )
    );
  };

  return {
    all: useInfiniteQuery(getChatMessageInfiniteQueryOptions(odinClient, conversationId)),
    markAsRead: useMutation({
      mutationKey: ['markAsRead', conversationId],
      mutationFn: markAsRead,
      onError: (error) => {
        console.error('Error marking chat as read', { error });
      },
    }),
    delete: useMutation({
      mutationFn: removeMessage,

      onSettled: async (_data, _error, variables) => {
        invalidateChatMessages(
          queryClient,
          variables.conversation.fileMetadata.appData.uniqueId as string
        );
      },
    }),
  };
};

const fetchMessages = async (
  odinClient: OdinClient,
  conversationId: string,
  cursorState: string | undefined
) => {
  return await getChatMessages(
    odinClient,
    conversationId,
    cursorState,
    cursorState ? PAGE_SIZE : FIRST_PAGE_SIZE
  );
};

export const getChatMessageInfiniteQueryOptions: (
  odinClient: OdinClient,
  conversationId: string | undefined
) => UndefinedInitialDataInfiniteOptions<{
  searchResults: (HomebaseFile<ChatMessage> | null)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> = (odinClient, conversationId) => ({
  queryKey: ['chat-messages', formatGuidId(conversationId)],
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) =>
    fetchMessages(
      odinClient,
      formatGuidId(conversationId as string),
      pageParam as string | undefined
    ),
  getNextPageParam: (lastPage, pages) =>
    lastPage &&
      lastPage.searchResults?.length >= (lastPage === pages[0] ? FIRST_PAGE_SIZE : PAGE_SIZE)
      ? lastPage.cursorState
      : undefined,
  enabled: !!conversationId,
  staleTime: 1000 * 60 * 60 * 24, // 24 hour
});

export const invalidateChatMessages = (queryClient: QueryClient, conversationId?: string) => {
  queryClient.invalidateQueries({
    queryKey: ['chat-messages', conversationId].filter(Boolean),
    exact: !!conversationId,
  });
};

export const updateCacheChatMessages = (
  queryClient: QueryClient,
  conversationId: string,
  transformFn: (
    data: InfiniteData<{
      searchResults: HomebaseFile<ChatMessage>[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  ) =>
    | InfiniteData<{
      searchResults: (HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
    | undefined
) => {
  const currentData = queryClient.getQueryData<
    InfiniteData<{
      searchResults: HomebaseFile<ChatMessage>[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['chat-messages', conversationId]);
  if (!currentData || !currentData?.pages?.length) return;

  const newData = transformFn(currentData);
  if (!newData) return;

  queryClient.setQueryData(['chat-messages', conversationId], newData);
  return currentData;
};

export const insertNewMessagesForConversation = (
  queryClient: QueryClient,
  conversationId: string,
  newMessages: HomebaseFile<ChatMessage>[]
) => {
  const extistingMessages = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['chat-messages', conversationId]);

  if (
    newMessages.length > FIRST_PAGE_SIZE ||
    !extistingMessages ||
    !extistingMessages.pages.length
  ) {
    if (extistingMessages) {
      // Only reset the first page if we have data;
      queryClient.setQueryData(
        ['chat-messages', conversationId],
        (data: InfiniteData<unknown, unknown>) => {
          return {
            pages: data?.pages?.slice(0, 1) ?? [],
            pageParams: data?.pageParams?.slice(0, 1) || [undefined],
          };
        }
      );
    }
    queryClient.refetchQueries({ queryKey: ['chat-messages', conversationId] });
    return;
  }

  let runningMessages = extistingMessages;
  newMessages.forEach((newMessage) => {
    runningMessages = internalInsertNewMessage(runningMessages, newMessage);
  });

  queryClient.setQueryData(['chat-messages', conversationId], runningMessages, {
    updatedAt: new Date().getTime(),
  });
};

export const insertNewMessage = (
  queryClient: QueryClient,
  newMessage: HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>
) => {
  const conversationId = newMessage.fileMetadata.appData.groupId as string;

  const extistingMessages = updateCacheChatMessages(queryClient, conversationId, (data) =>
    internalInsertNewMessage(data, newMessage)
  );
  if (!extistingMessages) {
    invalidateChatMessages(queryClient, conversationId);
  }

  updateCacheChatMessage(
    queryClient,
    newMessage.fileMetadata.appData.uniqueId as string,
    () => newMessage
  );

  return { extistingMessages };
};

export const internalInsertNewMessage = (
  extistingMessages: InfiniteData<
    {
      searchResults: (HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    },
    unknown
  >,
  newMessage: HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>
): InfiniteData<{
  searchResults: (HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> => {
  if (!newMessage.fileMetadata.appData.uniqueId || !newMessage.fileMetadata.appData.groupId) {
    console.warn('Message does not have uniqueId or groupId', newMessage);
    return {
      ...extistingMessages,
      pages: extistingMessages.pages.map((page) => ({
        ...page,
        searchResults: page.searchResults.filter(Boolean) as (
          | HomebaseFile<ChatMessage>
          | NewHomebaseFile<ChatMessage>
        )[],
      })),
    };
  }

  const isNewFile = !extistingMessages.pages.some((page) =>
    page.searchResults.some(
      (msg) =>
        (newMessage.fileId && stringGuidsEqual(msg?.fileId, newMessage?.fileId)) ||
        (newMessage.fileMetadata.appData.uniqueId &&
          stringGuidsEqual(
            msg?.fileMetadata.appData.uniqueId,
            newMessage.fileMetadata.appData.uniqueId
          ))
    )
  );

  const newData = {
    ...extistingMessages,
    pages: extistingMessages?.pages?.map((page, index) => {
      if (isNewFile) {
        const filteredSearchResults = page.searchResults.filter(
          // Remove messages with the same fileId but more importantly uniqueId so we avoid duplicates with the optimistic update
          (msg) => {
            if (!msg) return false;

            if (newMessage.fileMetadata.appData.uniqueId) {
              return !stringGuidsEqual(
                msg?.fileMetadata.appData.uniqueId,
                newMessage.fileMetadata.appData.uniqueId
              );
            } else if (newMessage.fileId) {
              return !stringGuidsEqual(msg?.fileId, newMessage.fileId);
            }

            return true;
          }
        ) as HomebaseFile<ChatMessage>[];

        return {
          ...page,
          searchResults:
            index === 0
              ? [newMessage, ...filteredSearchResults].sort(
                (a, b) => (b.fileMetadata.created || 0) - (a.fileMetadata.created || 0)
              ) // Re-sort the first page, as the new message might be older than the first message in the page;
              : filteredSearchResults,
        };
      }

      return {
        ...page,
        searchResults: page.searchResults.reduce(
          (acc, msg) => {
            if (!msg) return acc;

            // FileId Duplicates: Message with same fileId is already in searchResults
            if (msg.fileId && acc.some((m) => stringGuidsEqual(m?.fileId, msg.fileId))) {
              return acc;
            }

            // UniqueId Duplicates: Message with same uniqueId is already in searchResults
            if (
              msg.fileMetadata.appData.uniqueId &&
              acc.some((m) =>
                stringGuidsEqual(
                  m?.fileMetadata.appData.uniqueId,
                  msg.fileMetadata.appData.uniqueId
                )
              )
            ) {
              return acc;
            }

            // Message in cache was from the server, then updating with fileId is enough
            if (msg.fileId && stringGuidsEqual(msg.fileId, newMessage.fileId)) {
              acc.push(newMessage);
              return acc;
            }

            // Message in cache is from unknown, then ensure if we need to update the message based on uniqueId
            if (
              msg.fileMetadata.appData.uniqueId &&
              stringGuidsEqual(
                msg.fileMetadata.appData.uniqueId,
                newMessage.fileMetadata.appData.uniqueId
              )
            ) {
              acc.push(newMessage);
              return acc;
            }

            acc.push(msg);
            return acc;
          },
          [] as (HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>)[]
        ),
      };
    }),
  };

  return newData;
};
