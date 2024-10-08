import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ChatDrive } from '../../providers/ConversationProvider';
import {
  deleteGroupReaction,
  getGroupReactions,
  GroupEmojiReaction,
  HomebaseFile,
  ReactionFile,
  ReactionPreview,
  uploadGroupReaction,
} from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import { UnifiedConversation } from '../../providers/ConversationProvider';
import { getNewId, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { insertNewMessage } from './useChatMessages';

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
      onMutate: async ({ message, reaction }) => {
        // Update the reaction overview
        const previousReactions =
          queryClient.getQueryData<ReactionFile[]>(['chat-reaction', message.fileId]) || [];

        const newReaction: ReactionFile = {
          authorOdinId: dotYouClient.getIdentity(),
          body: reaction,
        };

        queryClient.setQueryData(
          ['chat-reaction', message.fileId],
          [...previousReactions, newReaction]
        );

        // Update the message reaction preview
        const id = getNewId();
        const reactionPreview: ReactionPreview = {
          ...(message.fileMetadata.reactionPreview as ReactionPreview),
          reactions: {
            ...(message.fileMetadata.reactionPreview?.reactions as ReactionPreview['reactions']),
            [id]: {
              key: id,
              count: '1',
              reactionContent: JSON.stringify({ emoji: reaction }),
            },
          },
        };

        const messageWithReactionPreview: HomebaseFile<ChatMessage> = {
          ...message,
          fileMetadata: {
            ...message.fileMetadata,
            reactionPreview,
          },
        };

        insertNewMessage(queryClient, messageWithReactionPreview);
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,

      onMutate: async ({ message, reaction }) => {
        // Update the reaction overview
        const previousReactions = queryClient.getQueryData<ReactionFile[] | undefined>([
          'chat-reaction',
          message.fileId,
        ]);

        if (previousReactions) {
          queryClient.setQueryData(
            ['chat-reaction', message.fileId],
            [
              ...previousReactions.filter(
                (existingReaction) =>
                  existingReaction.authorOdinId !== reaction.authorOdinId ||
                  existingReaction.body !== reaction.body
              ),
            ]
          );
        }

        // Update the message reaction preview
        const reactions = message.fileMetadata.reactionPreview?.reactions as
          | ReactionPreview['reactions']
          | undefined;
        if (!reactions) return;

        const reactionKey = Object.keys(reactions).find(
          (key) =>
            tryJsonParse<{ emoji: string }>(reactions[key].reactionContent)?.emoji === reaction.body
        );
        if (!reactionKey) return;

        const reactionPreview: ReactionPreview = {
          ...(message.fileMetadata.reactionPreview as ReactionPreview),
          reactions: {
            ...reactions,
          },
        };

        delete reactionPreview.reactions[reactionKey];

        const messageWithReactionPreview: HomebaseFile<ChatMessage> = {
          ...message,
          fileMetadata: {
            ...message.fileMetadata,
            reactionPreview,
          },
        };

        insertNewMessage(queryClient, messageWithReactionPreview);
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
    [
      ...currentReactions.filter(
        (reaction) =>
          reaction.authorOdinId !== reactionAsReactionFile.authorOdinId ||
          reaction.body !== reactionAsReactionFile.body
      ),
      reactionAsReactionFile,
    ]
  );
};

export const removeReaction = (
  queryClient: QueryClient,
  messageLocalFileId: string,
  removedReaction: GroupEmojiReaction
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
    authorOdinId: removedReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(removedReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<ReactionFile[]>(
    ['chat-reaction', messageLocalFileId],
    currentReactions.filter(
      (reaction) =>
        reaction.authorOdinId !== reactionAsReactionFile.authorOdinId ||
        reaction.body !== reactionAsReactionFile.body
    )
  );
};
