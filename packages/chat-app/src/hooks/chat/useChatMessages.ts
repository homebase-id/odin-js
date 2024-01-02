import { useDotYouClient } from '@youfoundation/common-app';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { DriveSearchResult } from '@youfoundation/js-lib/core';

const PAGE_SIZE = 100;
export const useChatMessages = (props?: { conversationId: string | undefined }) => {
  const { conversationId } = props || { conversationId: undefined };
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

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

  const removeMessage = async ({
    conversation,
    messages,
    deleteForEveryone,
  }: {
    conversation: DriveSearchResult<Conversation>;
    messages: DriveSearchResult<ChatMessage>[];
    deleteForEveryone?: boolean;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const recipients = (conversationContent as GroupConversation).recipients || [
      (conversationContent as SingleConversation).recipient,
    ];

    return await Promise.all(
      messages.map(async (msg) => {
        await softDeleteChatMessage(dotYouClient, msg, recipients, deleteForEveryone);
      })
    );
  };

  return {
    all: useInfiniteQuery({
      queryKey: ['chat', conversationId],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMessages(conversationId as string, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.searchResults?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      enabled: !!conversationId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
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
    delete: useMutation({
      mutationFn: removeMessage,
      onMutate: async ({ conversation, messages }) => {
        // TODO: Optimistic update of the chat messages delete the new message from the list
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat', variables.conversation.fileMetadata.appData.uniqueId],
        });
      },
    }),
  };
};
