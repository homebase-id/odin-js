import { ReactionContext, ReactionFile } from '@youfoundation/js-lib/public';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  AuthorImage,
  AuthorName,
  t,
  useEmojiReactions,
  useEmojiSummary,
} from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';

import { DialogWrapper } from '@youfoundation/common-app';

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
  const { data: reactionDetails, hasNextPage, fetchNextPage } = useEmojiReactions(context).fetch;
  const { data: reactionSummary, isFetchedAfterMount: reactionSummaryLoaded } = useEmojiSummary({
    context,
  }).fetch;

  const [activeEmoji, setActiveEmoji] = useState<string>();

  useEffect(() => {
    if (reactionSummary?.reactions?.length && !activeEmoji) {
      setActiveEmoji(reactionSummary?.reactions?.[0].emoji);
    }
  }, [reactionSummaryLoaded]);

  if (!isOpen) {
    return null;
  }

  const flattenedReactions = reactionDetails?.pages
    .flatMap((page) => page?.reactions)
    .filter(Boolean) as ReactionFile[];

  const dialog = (
    <DialogWrapper
      title={t('Reactions')}
      onClose={onClose}
      isSidePanel={false}
      isPaddingLess={true}
    >
      <ul className="flex flex-row bg-slate-100 px-4 dark:bg-slate-700 sm:px-8">
        {reactionSummary?.reactions?.map((reaction, index) => {
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
          ?.filter((reaction) => reaction.content.body === activeEmoji)
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
