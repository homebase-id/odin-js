import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ChatDrive, ConversationMetadata } from '../../providers/ConversationProvider';
import {
  deleteGroupReaction,
  getGroupReactions,
  GroupEmojiReaction,
  HomebaseFile,
  EmojiReaction,
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
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    message: HomebaseFile<ChatMessage>;
    reaction: string;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getHostIdentity();
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
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    message: HomebaseFile<ChatMessage>;
    reaction: EmojiReaction;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getHostIdentity();
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
          queryClient.getQueryData<EmojiReaction[]>(['chat-reaction', message.fileId]) || [];

        const newReaction: EmojiReaction = {
          authorOdinId: dotYouClient.getHostIdentity(),
          body: reaction,
        };

        queryClient.setQueryData(
          ['chat-reaction', message.fileId],
          [...previousReactions, newReaction]
        );

        // Update the message reaction preview
        const hasReaction = Object.values(
          message.fileMetadata.reactionPreview?.reactions || {}
        ).some(
          (reactionPrev) => reactionPrev.reactionContent === JSON.stringify({ emoji: reaction })
        );

        const id = getNewId();
        let newReactionPreview: ReactionPreview = message.fileMetadata
          .reactionPreview as ReactionPreview;

        if (hasReaction) {
          const currentReactions = message.fileMetadata.reactionPreview?.reactions || {};
          Object.keys(currentReactions).forEach((key) => {
            if (currentReactions[key].reactionContent === JSON.stringify({ emoji: reaction })) {
              newReactionPreview.reactions[key] = {
                ...newReactionPreview.reactions[key],
                count: (parseInt(currentReactions[key].count) + 1).toString(),
              };
            }
          });
        } else {
          newReactionPreview = {
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
        }

        const messageWithReactionPreview: HomebaseFile<ChatMessage> = {
          ...message,
          fileMetadata: {
            ...message.fileMetadata,
            reactionPreview: newReactionPreview,
          },
        };

        insertNewMessage(queryClient, messageWithReactionPreview);
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,

      onMutate: async ({ message, reaction }) => {
        // Update the reaction overview
        const previousReactions = queryClient.getQueryData<EmojiReaction[] | undefined>([
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
        const newReactions = message.fileMetadata.reactionPreview?.reactions as
          | ReactionPreview['reactions']
          | undefined;
        if (!newReactions) return;

        const reactionKey = Object.keys(newReactions).find(
          (key) =>
            tryJsonParse<{ emoji: string }>(newReactions[key].reactionContent)?.emoji ===
            reaction.body
        );
        if (!reactionKey) return;

        newReactions[reactionKey] = {
          ...newReactions[reactionKey],
          count: (parseInt(newReactions[reactionKey].count) - 1).toString(),
        };

        const reactionPreview: ReactionPreview = {
          ...(message.fileMetadata.reactionPreview as ReactionPreview),
          reactions: {
            ...newReactions,
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
  };
};

export const insertNewReaction = (
  queryClient: QueryClient,
  messageLocalFileId: string,
  newReaction: GroupEmojiReaction
) => {
  const currentReactions = queryClient.getQueryData<EmojiReaction[] | undefined>([
    'chat-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['chat-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsEmojiReaction: EmojiReaction = {
    authorOdinId: newReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(newReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<EmojiReaction[]>(
    ['chat-reaction', messageLocalFileId],
    [
      ...currentReactions.filter(
        (reaction) =>
          reaction.authorOdinId !== reactionAsEmojiReaction.authorOdinId ||
          reaction.body !== reactionAsEmojiReaction.body
      ),
      reactionAsEmojiReaction,
    ]
  );
};

export const removeReaction = (
  queryClient: QueryClient,
  messageLocalFileId: string,
  removedReaction: GroupEmojiReaction
) => {
  const currentReactions = queryClient.getQueryData<EmojiReaction[] | undefined>([
    'chat-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['chat-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsEmojiReaction: EmojiReaction = {
    authorOdinId: removedReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(removedReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<EmojiReaction[]>(
    ['chat-reaction', messageLocalFileId],
    currentReactions.filter(
      (reaction) =>
        reaction.authorOdinId !== reactionAsEmojiReaction.authorOdinId ||
        reaction.body !== reactionAsEmojiReaction.body
    )
  );
};
