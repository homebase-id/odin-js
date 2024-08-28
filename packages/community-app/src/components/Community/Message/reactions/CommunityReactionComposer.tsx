import { ReactionsBar, useDotYouClient } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { useCommunityReaction } from '../../../../hooks/community/reactions/useCommunityReaction';

export const CommunityReactionComposer = ({
  community,
  msg,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  msg: HomebaseFile<CommunityMessage>;
}) => {
  const identity = useDotYouClient().getIdentity();

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

  const myReactions = data?.filter((reaction) => reaction?.authorOdinId === identity);

  if (!community) return null;
  return (
    <ReactionsBar
      className={''}
      emojis={['👍️', '❤️', '😂']}
      defaultValue={[]}
      doLike={(emoji) => addReaction({ community, message: msg, reaction: emoji })}
      doUnlike={(emoji) => {
        const reactionFile = myReactions?.find((reaction) => reaction.body === emoji);
        if (reactionFile) removeReaction({ community, message: msg, reaction: reactionFile });
      }}
    />
  );
};
