import { HomebaseFile } from '@homebase-id/js-lib/core';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';
import { t, useDotYouClientContext } from '@homebase-id/common-app';
import { useCommunityReaction } from '../../../../hooks/community/reactions/useCommunityReaction';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';

export const CommunityReactions = ({
  msg,
  community,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community: HomebaseFile<CommunityDefinition> | undefined;
}) => {
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
  if (!msg.fileMetadata.reactionPreview?.reactions || !community) return null;

  const reactions = Object.values(msg.fileMetadata.reactionPreview?.reactions).map((reaction) => {
    return {
      emoji: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
      count: reaction.count,
    };
  });
  const uniqueEmojis = Array.from(new Set(reactions));
  if (!reactions?.length) return null;

  return (
    <>
      <div className="mt-2 flex flex-row">
        <div className="flex cursor-pointer flex-row items-center gap-1">
          {uniqueEmojis?.map((emoji) => {
            const myReaction = myReactions?.find((reaction) => reaction.body === emoji.emoji);
            const authors = data
              ?.filter((reaction) => reaction.body === emoji.emoji)
              .map((reaction) =>
                reaction.authorOdinId === loggedOnIdentity ? t('You') : reaction.authorOdinId
              );

            if (!emoji.count || emoji.count === '0') return null;

            return (
              <button
                key={emoji.emoji}
                className={`flex flex-row items-center gap-2 rounded-3xl border bg-background px-2 py-[0.1rem] shadow-sm hover:bg-primary hover:text-primary-contrast ${myReaction ? 'border-primary bg-primary/10 dark:bg-primary/60' : 'border-transparent'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (myReaction) removeReaction({ community, message: msg, reaction: myReaction });
                  else addReaction({ community, message: msg, reaction: emoji.emoji });
                }}
                title={`${authors?.length ? authors.join(', ') : ''} ${t('reacted with')} ${emoji.emoji}`}
              >
                <p>{emoji.emoji}</p>
                <p className="text-sm">{emoji.count}</p>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
