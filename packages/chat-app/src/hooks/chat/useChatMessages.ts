import { useDotYouClient } from '@youfoundation/common-app';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import {
  ChatDeliveryStatus,
  ChatMessage,
  getChatMessages,
  requestMarkAsRead,
} from '../../providers/ChatProvider';
import { Conversation } from '../../providers/ConversationProvider';
import { DriveSearchResult } from '@youfoundation/js-lib/core';

const PAGE_SIZE = 100;
export const useChatMessages = (props?: { conversationId: string | undefined }) => {
  const { conversationId } = props || { conversationId: undefined };
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchMessages = async (conversationId: string, cursorState: string | undefined) => {
    return await getChatMessages(dotYouClient, conversationId, cursorState, PAGE_SIZE);
  };

  const markAsRead = async ({
    conversation,
    messages,
  }: {
    conversation: DriveSearchResult<Conversation>;
    messages: DriveSearchResult<ChatMessage>[];
  }) => {
    // => Much nicer solution: Handle with a last read time on the conversation file;
    const messagesToMarkAsRead = messages
      .filter(
        (msg) =>
          msg.fileMetadata.appData.content.deliveryStatus !== ChatDeliveryStatus.Read &&
          msg.fileMetadata.senderOdinId &&
          msg.fileMetadata.globalTransitId
      )
      .map((msg) => msg.fileMetadata.globalTransitId) as string[];

    await requestMarkAsRead(dotYouClient, conversation, messagesToMarkAsRead);
  };

  return {
    all: useInfiniteQuery({
      queryKey: ['chat', conversationId],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMessages(conversationId as string, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.searchResults?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      enabled: !!conversationId,
    }),
    markAsRead: useMutation({
      mutationFn: markAsRead,
      onError: (error) => {
        console.error('Error marking chat as read', { error });
      },
      // onMutate: async ({ conversation, recipients, message }) => {
      //   // TODO: Optimistic update of the chat messages append the new message to the list
      // },
      // onSettled: async (_data, _error, variables) => {
      //   queryClient.invalidateQueries({ queryKey: ['chat', variables.conversationId] });
      // },
    }),
  };
};
