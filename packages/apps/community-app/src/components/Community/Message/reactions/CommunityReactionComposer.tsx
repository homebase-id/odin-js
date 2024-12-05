import { ReactionsBar, ReactionsBarHandle, useDotYouClientContext } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { useCommunityReaction } from '../../../../hooks/community/reactions/useCommunityReaction';
import { forwardRef, Ref } from 'react';

export const CommunityReactionComposer = forwardRef(
  (
    {
      community,
      msg,
      onOpen,
      onClose,
    }: {
      community: HomebaseFile<CommunityDefinition> | undefined;
      msg: HomebaseFile<CommunityMessage>;
      onOpen?: () => void;
      onClose?: () => void;
    },
    ref: Ref<ReactionsBarHandle>
  ) => {
    const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

    const { mutate: addReaction } = useCommunityReaction().add;
    const { mutate: removeReaction } = useCommunityReaction().remove;

    const hasReactions =
      msg.fileMetadata.reactionPreview?.reactions &&
      Object.keys(msg.fileMetadata.reactionPreview?.reactions).length;

    const { data } = useCommunityReaction({
      community,
      messageFileId: hasReactions ? msg.fileId : undefined,
      messageGlobalTransitId: msg.fileMetadata.globalTransitId,
    }).get;

    const myReactions = data?.filter((reaction) => reaction?.authorOdinId === loggedOnIdentity);

    if (!community) return null;
    return (
      <ReactionsBar
        ref={ref}
        className={''}
        emojis={['👍️', '❤️', '😂']}
        defaultValue={[]}
        doLike={(emoji) => addReaction({ community, message: msg, reaction: emoji })}
        doUnlike={(emoji) => {
          const reaction = myReactions?.find((reaction) => reaction.body === emoji);
          if (reaction) removeReaction({ community, message: msg, reaction: reaction });
        }}
        onOpen={onOpen}
        onClose={onClose}
      />
    );
  }
);
CommunityReactionComposer.displayName = 'CommunityReactionComposer';
