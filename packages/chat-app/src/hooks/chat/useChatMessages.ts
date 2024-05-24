import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ChatDeliveryStatus,
  ChatMessage,
  getChatMessages,
  requestMarkAsRead,
  softDeleteChatMessage,
} from '../../providers/ChatProvider';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

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
    conversation: HomebaseFile<Conversation>;
    messages: HomebaseFile<ChatMessage>[];
  }) => {
    // => Much nicer solution: Handle with a last read time on the conversation file;
    const messagesToMarkAsRead = messages
      .filter(
        (msg) =>
          msg.fileMetadata.appData.content.deliveryStatus !== ChatDeliveryStatus.Read &&
          msg.fileMetadata.senderOdinId &&
          msg.fileMetadata.appData.uniqueId
      )
      .map((msg) => msg.fileMetadata.appData.uniqueId) as string[];

    return await requestMarkAsRead(dotYouClient, conversation, messagesToMarkAsRead);
  };

  const removeMessage = async ({
    conversation,
    messages,
    deleteForEveryone,
  }: {
    conversation: HomebaseFile<Conversation>;
    messages: HomebaseFile<ChatMessage>[];
    deleteForEveryone?: boolean;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const recipients = (conversationContent as GroupConversation).recipients || [
      (conversationContent as SingleConversation).recipient,
    ];

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
            // Remove messages without a fileId, as the optimistic mutations should be removed when there's actual data coming over the websocket;
            //   And There shouldn't be any duplicates, but just in case
            (msg) => msg && msg?.fileId && !stringGuidsEqual(msg?.fileId, newMessage.fileId)
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
          searchResults: page.searchResults.map((msg) =>
            msg?.fileId && stringGuidsEqual(msg?.fileId, newMessage.fileId) ? newMessage : msg
          ),
        };
      }),
    };

    queryClient.setQueryData(['chat-messages', conversationId], newData);
  } else {
    queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
  }

  queryClient.setQueryData(['chat-message', newMessage.fileMetadata.appData.uniqueId], newMessage);
};
