import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteGroupReaction,
  getGroupReactions,
  GroupEmojiReaction,
  HomebaseFile,
  ReactionFile,
  ReactionPreview,
  uploadGroupReaction,
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
          await getGroupReactions(dotYouClient, {
            target: {
              globalTransitId: messageGlobalTransitId,
              targetDrive: getTargetDriveFromCommunityId(communityId),
            },
          })
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

    return await uploadGroupReaction(
      dotYouClient,
      targetDrive,
      message.fileMetadata.globalTransitId,
      reaction,
      [community.fileMetadata.senderOdinId]
    );
  };

  const removeReaction = async ({
    community,
    message,
    reaction,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    message: HomebaseFile<CommunityMessage>;
    reaction: ReactionFile;
  }) => {
    if (!community || !message) return;
    const communityContent = community.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const members = communityContent.members.filter((recipient) => recipient !== identity);

    const targetDrive = getTargetDriveFromCommunityId(
      community.fileMetadata.appData.uniqueId as string
    );

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await deleteGroupReaction(dotYouClient, targetDrive, members, reaction, {
      fileId: message.fileId,
      globalTransitId: message.fileMetadata.globalTransitId,
      targetDrive: targetDrive,
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
          queryClient.getQueryData<ReactionFile[]>(['community-reaction', message.fileId]) || [];

        const newReaction: ReactionFile = {
          authorOdinId: dotYouClient.getIdentity(),
          body: reaction,
        };

        queryClient.setQueryData(
          ['community-reaction', message.fileId],
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
    remove: useMutation({
      mutationFn: removeReaction,

      onMutate: async ({ community, message, reaction }) => {
        // Update the reaction overview
        const previousReactions = queryClient.getQueryData<ReactionFile[] | undefined>([
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
  const currentReactions = queryClient.getQueryData<ReactionFile[] | undefined>([
    'community-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['community-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsReactionFile: ReactionFile = {
    authorOdinId: newReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(newReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<ReactionFile[]>(
    ['community-reaction', messageLocalFileId],
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
    'community-reaction',
    messageLocalFileId,
  ]);

  if (!currentReactions) {
    queryClient.invalidateQueries({ queryKey: ['community-reaction', messageLocalFileId] });
    return;
  }

  const reactionAsReactionFile: ReactionFile = {
    authorOdinId: removedReaction.odinId,
    body: tryJsonParse<{ emoji: string }>(removedReaction.reactionContent).emoji,
  };

  queryClient.setQueryData<ReactionFile[]>(
    ['community-reaction', messageLocalFileId],
    currentReactions.filter(
      (reaction) =>
        reaction.authorOdinId !== reactionAsReactionFile.authorOdinId ||
        reaction.body !== reactionAsReactionFile.body
    )
  );
};
