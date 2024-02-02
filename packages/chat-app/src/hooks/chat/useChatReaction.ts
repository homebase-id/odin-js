import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { ChatMessage } from '../../providers/ChatProvider';
import {
  ChatReaction,
  deleteReaction,
  getReactions,
  uploadReaction,
} from '../../providers/ChatReactionProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useChatReaction = (props?: {
  conversationId: string | undefined;
  messageId: string | undefined;
}) => {
  const { conversationId, messageId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getReactionsByMessageUniqueId = (conversationId: string, messageId: string) => async () => {
    return (await getReactions(dotYouClient, conversationId, messageId))?.searchResults || [];
  };

  const addReaction = async ({
    conversation,
    message,
    reaction,
  }: {
    conversation: DriveSearchResult<Conversation>;
    message: DriveSearchResult<ChatMessage>;
    reaction: string;
  }) => {
    const conversationId = conversation.fileMetadata.appData.uniqueId as string;
    const conversationContent = conversation.fileMetadata.appData.content;
    const recipients =
      (conversationContent as GroupConversation).recipients ||
      [(conversationContent as SingleConversation).recipient].filter(Boolean);

    const newReaction: NewDriveSearchResult<ChatReaction> = {
      fileMetadata: {
        appData: {
          groupId: message.fileMetadata.appData.uniqueId,
          tags: [conversationId],
          content: {
            message: reaction,
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    return await uploadReaction(dotYouClient, conversationId, newReaction, recipients);
  };

  const removeReaction = async ({
    conversation,
    message,
    reaction,
  }: {
    conversation: DriveSearchResult<Conversation>;
    message: DriveSearchResult<ChatMessage>;
    reaction: DriveSearchResult<ChatReaction>;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const recipients =
      (conversationContent as GroupConversation).recipients ||
      [(conversationContent as SingleConversation).recipient].filter(Boolean);

    return await deleteReaction(dotYouClient, reaction, recipients);
  };

  return {
    get: useQuery({
      queryKey: ['chat-reaction', messageId],
      queryFn: getReactionsByMessageUniqueId(conversationId as string, messageId as string),
      enabled: !!conversationId && !!messageId,
    }),
    add: useMutation({
      mutationFn: addReaction,
      onMutate: async () => {
        //
      },
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.appData.uniqueId],
        });
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,
      onMutate: async () => {
        //
      },
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.appData.uniqueId],
        });
      },
    }),
  };
};
