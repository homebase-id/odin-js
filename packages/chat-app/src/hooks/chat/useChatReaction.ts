import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ChatDrive } from '../../providers/ConversationProvider';
import {
  deleteGroupReaction,
  getGroupReactions,
  GroupEmojiReaction,
  HomebaseFile,
  ReactionFile,
  uploadGroupReaction,
} from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { UnifiedConversation } from '../../providers/ConversationProvider';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

export const useChatReaction = (props?: {
  messageGlobalTransitId: string | undefined;
  messageFileId: string | undefined;
}) => {
  const { messageGlobalTransitId, messageFileId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getReactionsByMessageGlobalTransitId = (messageGlobalTransitId: string) => async () => {
    const reactions =
      (
        await getGroupReactions(dotYouClient, {
          target: {
            globalTransitId: messageGlobalTransitId,
            targetDrive: ChatDrive,
          },
        })
      )?.reactions || [];

    if (reactions.length) {
      console.log('reactions', reactions);
    }

    return reactions;
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

    return await uploadGroupReaction(
      dotYouClient,
      ChatDrive,
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

    return await deleteGroupReaction(dotYouClient, ChatDrive, recipients, reaction, {
      fileId: message.fileId,
      globalTransitId: message.fileMetadata.globalTransitId,
      targetDrive: ChatDrive,
    });
  };

  return {
    get: useQuery({
      queryKey: ['chat-reaction', messageFileId],
      queryFn: getReactionsByMessageGlobalTransitId(messageGlobalTransitId as string),
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

export const insertNewReaction = (
  queryClient: QueryClient,
  messageLocalFileId: string,
  newReaction: GroupEmojiReaction
) => {
  const currentReactions = queryClient.getQueryData<ReactionFile[] | undefined>([
    'chat-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['chat-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsReactionFile: ReactionFile = {
    authorOdinId: newReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(newReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<ReactionFile[]>(
    ['chat-reaction', messageLocalFileId],
    [...currentReactions, reactionAsReactionFile]
  );
};
