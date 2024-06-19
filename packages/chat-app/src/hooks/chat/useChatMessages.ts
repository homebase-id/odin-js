import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ChatMessage,
  getChatMessages,
  requestMarkAsRead,
  softDeleteChatMessage,
} from '../../providers/ChatProvider';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { UnifiedConversation } from '../../providers/ConversationProvider';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { SendReadReceiptResponseRecipientStatus } from '@youfoundation/js-lib/peer';

const PAGE_SIZE = 100;
export const useChatMessages = (props?: { conversationId: string | undefined }) => {
  const { conversationId } = props || { conversationId: undefined };
  const dotYouClient = useDotYouClientContext();

  const queryClient = useQueryClient();

  const fetchMessages = async (conversationId: string, cursorState: string | undefined) =>
    await getChatMessages(dotYouClient, conversationId, cursorState, PAGE_SIZE);

  const markAsRead = async ({
    conversation,
    messages,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    messages: HomebaseFile<ChatMessage>[];
  }) => {
    const response = await requestMarkAsRead(dotYouClient, conversation, messages);

    response.results.forEach((result) => {
      const someFailed = result.status.some(
        (recipientStatus) =>
          !recipientStatus.status ||
          recipientStatus.status?.toLowerCase() ===
            SendReadReceiptResponseRecipientStatus.SenderServerHadAnInternalError
      );
      if (someFailed) {
        // TODO: Should we throw an error?
        console.error('Error marking chat as read', { response });
      }
    });

    return response;
  };

  const removeMessage = async ({
    conversation,
    messages,
    deleteForEveryone,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    messages: HomebaseFile<ChatMessage>[];
    deleteForEveryone?: boolean;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    return await Promise.all(
      messages.map(async (msg) => {
        await softDeleteChatMessage(
          dotYouClient,
          msg,
          recipients.filter(Boolean),
          deleteForEveryone
        );
      })
    );
  };

  return {
    all: useInfiniteQuery({
      queryKey: ['chat-messages', conversationId],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMessages(conversationId as string, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage?.searchResults && lastPage?.searchResults?.length >= PAGE_SIZE
          ? lastPage.cursorState
          : undefined,
      enabled: !!conversationId,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 60 * 24, // 24 hour
    }),
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
        queryClient.invalidateQueries({
          queryKey: ['chat-messages', variables.conversation.fileMetadata.appData.uniqueId],
        });
      },
    }),
  };
};

export const insertNewMessage = (
  queryClient: QueryClient,
  newMessage: HomebaseFile<ChatMessage>,
  isUpdate?: boolean
) => {
  const conversationId = newMessage.fileMetadata.appData.groupId;

  const extistingMessages = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<ChatMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['chat-messages', conversationId]);

  if (extistingMessages) {
    const isNewFile =
      isUpdate === undefined
        ? !extistingMessages.pages.some((page) =>
            page.searchResults.some((msg) => stringGuidsEqual(msg?.fileId, newMessage.fileId))
          )
        : !isUpdate;

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
                    (a, b) => b.fileMetadata.created - a.fileMetadata.created
                  ) // Re-sort the first page, as the new message might be older than the first message in the page;
                : filteredSearchResults,
          };
        }

        return {
          ...page,
          searchResults: (
            page.searchResults
              .map((msg) =>
                msg?.fileId && stringGuidsEqual(msg?.fileId, newMessage.fileId) ? newMessage : msg
              )
              .filter((msg) => {
                if (!msg) return false;
                // (Sanity for fileModified) Remove messages without a fileId and the same uniqueId so we avoid duplicates with the optimistic update
                if (!msg.fileId && newMessage.fileMetadata.appData.uniqueId) {
                  return !stringGuidsEqual(
                    msg?.fileMetadata.appData.uniqueId,
                    newMessage.fileMetadata.appData.uniqueId
                  );
                }

                return true;
              }) as HomebaseFile<ChatMessage>[]
          ).reduce((acc, msg) => {
            if (!acc.some((m) => stringGuidsEqual(m?.fileId, msg?.fileId))) {
              acc.push(msg);
            }

            return acc;
          }, [] as HomebaseFile<ChatMessage>[]),
        };
      }),
    };

    queryClient.setQueryData(['chat-messages', conversationId], newData);
  } else {
    queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
  }

  queryClient.setQueryData(['chat-message', newMessage.fileMetadata.appData.uniqueId], newMessage);
};
