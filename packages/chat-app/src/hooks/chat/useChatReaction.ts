import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import {
  ChatReaction,
  deleteReaction,
  getReactions,
  uploadReaction,
} from '../../providers/ChatReactionProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { UnifiedConversation } from '../../providers/ConversationProvider';

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
    conversation: HomebaseFile<UnifiedConversation>;
    message: HomebaseFile<ChatMessage>;
    reaction: string;
  }) => {
    const conversationId = conversation.fileMetadata.appData.uniqueId as string;
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    const newReaction: NewHomebaseFile<ChatReaction> = {
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

    reaction,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    message: HomebaseFile<ChatMessage>;
    reaction: HomebaseFile<ChatReaction>;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    return await deleteReaction(dotYouClient, reaction, recipients);
  };

  return {
    get: useQuery({
      queryKey: ['chat-reaction', messageId],
      queryFn: getReactionsByMessageUniqueId(conversationId as string, messageId as string),
      enabled: !!conversationId && !!messageId,
      staleTime: 1000 * 60 * 10, // 10 min
    }),
    add: useMutation({
      mutationFn: addReaction,
      onMutate: async (variables) => {
        const { message } = variables;
        const previousReactions = queryClient.getQueryData<HomebaseFile<ChatReaction>[]>([
          'chat-reaction',
          message.fileMetadata.appData.uniqueId,
        ]);

        if (!previousReactions) return;
        const newReaction: NewHomebaseFile<ChatReaction> = {
          fileMetadata: {
            appData: {
              content: {
                message: variables.reaction,
              },
            },
          },
          serverMetadata: {
            accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected },
          },
        };

        queryClient.setQueryData(
          ['chat-reaction', message.fileMetadata.appData.uniqueId],
          [...previousReactions, newReaction]
        );
      },
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.appData.uniqueId],
        });
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,
      onMutate: async (variables) => {
        const { message, reaction } = variables;
        const previousReactions = queryClient.getQueryData<HomebaseFile<ChatReaction>[]>([
          'chat-reaction',
          message.fileMetadata.appData.uniqueId,
        ]);

        if (!previousReactions) return;

        queryClient.setQueryData(
          ['chat-reaction', message.fileMetadata.appData.uniqueId],
          [...previousReactions.filter((r) => !stringGuidsEqual(r.fileId, reaction.fileId))]
        );
      },
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.appData.uniqueId],
        });
      },
    }),
  };
};
