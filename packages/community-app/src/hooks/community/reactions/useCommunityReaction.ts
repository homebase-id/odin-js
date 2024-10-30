import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteReaction,
  getReactions,
  GroupEmojiReaction,
  HomebaseFile,
  EmojiReaction,
  ReactionPreview,
  uploadReaction,
} from '@homebase-id/js-lib/core';
import { getNewId, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { insertNewMessage } from '../messages/useCommunityMessages';

export const useCommunityReaction = (props?: {
  messageGlobalTransitId: string | undefined;
  messageFileId: string | undefined;
  community: HomebaseFile<CommunityDefinition> | undefined;
}) => {
  const { messageGlobalTransitId, messageFileId, community } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getReactionsByMessageGlobalTransitId =
    (communityId: string, messageGlobalTransitId: string) => async () => {
      const reactions =
        (
          await getReactions(
            dotYouClient,
            community?.fileMetadata.senderOdinId,
            {
              fileId: messageFileId,
              globalTransitId: messageGlobalTransitId,
              targetDrive: getTargetDriveFromCommunityId(communityId),
            },
            15
          )
        )?.reactions || [];

      return reactions;
    };

  const addReaction = async ({
    community,
    message,
    reaction,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    message: HomebaseFile<CommunityMessage>;
    reaction: string;
  }) => {
    if (!community || !message) return;
    const targetDrive = getTargetDriveFromCommunityId(
      community.fileMetadata.appData.uniqueId as string
    );

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await uploadReaction(dotYouClient, reaction, community.fileMetadata.senderOdinId, {
      fileId: message.fileId,
      globalTransitId: message.fileMetadata.globalTransitId,
      targetDrive,
    });
  };

  const removeReaction = async ({
    community,
    message,
    reaction,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    message: HomebaseFile<CommunityMessage>;
    reaction: EmojiReaction;
  }) => {
    if (!community || !message) return;

    const targetDrive = getTargetDriveFromCommunityId(
      community.fileMetadata.appData.uniqueId as string
    );

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await deleteReaction(dotYouClient, reaction, community.fileMetadata.senderOdinId, {
      targetDrive,
      fileId: message.fileId,
      globalTransitId: message.fileMetadata.globalTransitId,
    });
  };

  return {
    get: useQuery({
      queryKey: ['community-reaction', messageFileId],
      queryFn: getReactionsByMessageGlobalTransitId(
        community?.fileMetadata.appData.uniqueId as string,
        messageGlobalTransitId as string
      ),
      enabled: !!community && !!messageGlobalTransitId && !!messageFileId,
      staleTime: 1000 * 60 * 10, // 10 min
    }),
    add: useMutation({
      mutationFn: addReaction,
      onMutate: async ({ community, message, reaction }) => {
        // Update the reaction overview
        const previousReactions =
          queryClient.getQueryData<EmojiReaction[]>(['community-reaction', message.fileId]) || [];

        const newReaction: EmojiReaction = {
          authorOdinId: dotYouClient.getIdentity(),
          body: reaction,
        };

        queryClient.setQueryData(
          ['community-reaction', message.fileId],
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

        const messageWithReactionPreview: HomebaseFile<CommunityMessage> = {
          ...message,
          fileMetadata: {
            ...message.fileMetadata,
            reactionPreview: newReactionPreview,
          },
        };

        insertNewMessage(
          queryClient,
          messageWithReactionPreview,
          community.fileMetadata.appData.uniqueId as string
        );
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,

      onMutate: async ({ community, message, reaction }) => {
        // Update the reaction overview
        const previousReactions = queryClient.getQueryData<EmojiReaction[] | undefined>([
          'community-reaction',
          message.fileId,
        ]);

        if (previousReactions) {
          queryClient.setQueryData(
            ['community-reaction', message.fileId],
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

        // TODO: decrease the count of the reaction instead of removing it

        delete reactionPreview.reactions[reactionKey];

        const messageWithReactionPreview: HomebaseFile<CommunityMessage> = {
          ...message,
          fileMetadata: {
            ...message.fileMetadata,
            reactionPreview,
          },
        };

        insertNewMessage(
          queryClient,
          messageWithReactionPreview,
          community.fileMetadata.appData.uniqueId as string
        );
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
    'community-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['community-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsEmojiReaction: EmojiReaction = {
    authorOdinId: newReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(newReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<EmojiReaction[]>(
    ['community-reaction', messageLocalFileId],
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
    'community-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['community-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsEmojiReaction: EmojiReaction = {
    authorOdinId: removedReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(removedReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<EmojiReaction[]>(
    ['community-reaction', messageLocalFileId],
    currentReactions.filter(
      (reaction) =>
        reaction.authorOdinId !== reactionAsEmojiReaction.authorOdinId ||
        reaction.body !== reactionAsEmojiReaction.body
    )
  );
};
