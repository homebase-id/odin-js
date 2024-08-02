import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ChatDrive } from '../../providers/ConversationProvider';
import { HomebaseFile, ReactionFile } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import { deleteReaction, getReactions, uploadReaction } from '../../providers/ChatReactionProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { UnifiedConversation } from '../../providers/ConversationProvider';

export const useChatReaction = (props?: {
  messageGlobalTransitId: string | undefined;
  messageFileId: string | undefined;
}) => {
  const { messageGlobalTransitId, messageFileId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getReactionsByMessageUniqueId =
    (messageFileId: string, messageGlobalTransitId: string) => async () => {
      return (
        (
          await getReactions(dotYouClient, {
            target: {
              fileId: messageFileId,
              globalTransitId: messageGlobalTransitId,
              targetDrive: ChatDrive,
            },
          })
        )?.reactions || []
      );
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
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await uploadReaction(
      dotYouClient,
      message.fileMetadata.globalTransitId,
      reaction,
      recipients
    );
  };

  const removeReaction = async ({
    conversation,
    message,
    reaction,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    message: HomebaseFile<ChatMessage>;
    reaction: ReactionFile;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await deleteReaction(dotYouClient, recipients, reaction, {
      fileId: message.fileId,
      globalTransitId: message.fileMetadata.globalTransitId,
      targetDrive: ChatDrive,
    });
  };

  return {
    get: useQuery({
      queryKey: ['chat-reaction', messageGlobalTransitId],
      queryFn: getReactionsByMessageUniqueId(
        messageFileId as string,
        messageGlobalTransitId as string
      ),
      enabled: !!messageGlobalTransitId && !!messageFileId,
      staleTime: 1000 * 60 * 10, // 10 min
    }),
    add: useMutation({
      mutationFn: addReaction,

      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.globalTransitId],
        });
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,

      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.globalTransitId],
        });
      },
    }),
  };
};
