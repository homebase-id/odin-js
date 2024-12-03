import { ReactionContext } from '@homebase-id/js-lib/public';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmojiReaction } from '@homebase-id/js-lib/core';
import { t } from '../../../../helpers';
import { usePortal, useEmojiReactions, useEmojiSummary } from '../../../../hooks';
import { DialogWrapper, ActionButton } from '../../../../ui';
import { AuthorImage } from '../../Author/AuthorImage';
import { AuthorName } from '../../Author/AuthorName';

export const ReactionDetailsDialog = ({
  context,

  isOpen,
  onClose,
}: {
  context: ReactionContext;

  isOpen: boolean;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    data: reactionDetails,
    hasNextPage,
    fetchNextPage,
    isFetchedAfterMount: reactionsDetailsLoaded,
  } = useEmojiReactions(context).fetch;
  const { data: reactionSummary, isFetchedAfterMount: reactionSummaryLoaded } = useEmojiSummary({
    context,
  }).fetch;

  const [activeEmoji, setActiveEmoji] = useState<string>();

  const flattenedReactions = reactionDetails?.pages
    .flatMap((page) => page?.reactions)
    .filter(Boolean) as EmojiReaction[];

  const filteredEmojis = reactionSummary?.reactions?.filter((reaction) =>
    flattenedReactions?.some((rct) => rct.body === reaction.emoji)
  );

  useEffect(() => {
    if (filteredEmojis?.length && !activeEmoji) {
      setActiveEmoji(filteredEmojis?.[0].emoji);
    }
  }, [reactionSummaryLoaded, reactionsDetailsLoaded]);

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={t('Reactions')}
      onClose={onClose}
      isSidePanel={false}
      isPaddingLess={true}
    >
      <ul className="flex flex-row bg-slate-100 px-4 dark:bg-slate-700 sm:px-8">
        {filteredEmojis?.map((reaction, index) => {
          return (
            <li className="" key={reaction.emoji}>
              <ActionButton
                type="mute"
                className={`border-b-primary rounded-none hover:border-b-2 ${
                  activeEmoji === reaction.emoji || (!activeEmoji && index === 0)
                    ? 'border-b-2'
                    : ''
                }`}
                onClick={() => setActiveEmoji(reaction.emoji)}
              >
                {reaction.emoji} {reaction.count}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-flow-row gap-4 px-4 py-4 sm:px-8">
        {flattenedReactions
          ?.filter((reaction) => reaction.body === activeEmoji)
          .map((reaction) => {
            return (
              <div className="flex flex-row items-center text-lg" key={reaction.authorOdinId}>
                <AuthorImage odinId={reaction.authorOdinId} size="xs" className="mr-2" />
                <AuthorName odinId={reaction.authorOdinId} />
              </div>
            );
          })}
        {hasNextPage ? (
          <div className="flex flex-row justify-center">
            <ActionButton onClick={() => fetchNextPage()} type="secondary">
              {t('Load more')}
            </ActionButton>
          </div>
        ) : null}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
