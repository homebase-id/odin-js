import { HomebaseFile, ReactionBase } from '@homebase-id/js-lib/core';
import { isTouchDevice, tryJsonParse } from '@homebase-id/js-lib/helpers';
import {
  ActionButton,
  AuthorImage,
  AuthorName,
  DialogWrapper,
  t,
  useOdinClientContext,
  useLongPress,
  usePortal,
} from '@homebase-id/common-app';
import { useCommunityReaction } from '../../../../hooks/community/reactions/useCommunityReaction';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';

export const CommunityReactions = ({
  msg,
  community,
  scrollRef,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community: HomebaseFile<CommunityDefinition> | undefined;
  scrollRef?: React.RefObject<HTMLDivElement>;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const [showDetails, setShowDetails] = useState(false);

  const hasReactions =
    msg.fileMetadata.reactionPreview?.reactions &&
    Object.keys(msg.fileMetadata.reactionPreview?.reactions).length;

  const { data: detailedReactions } = useCommunityReaction({
    community,
    messageFileId: hasReactions ? msg.fileId : undefined,
    messageGlobalTransitId: msg.fileMetadata.globalTransitId,
  }).get;

  const myReactions = detailedReactions?.filter(
    (reaction) => reaction?.authorOdinId === loggedOnIdentity
  );
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
      <div
        className="mt-2 flex flex-row"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
      >
        <div className="flex cursor-pointer flex-row items-center gap-1">
          {uniqueEmojis?.map((emoji) => (
            <ReactionButton
              scrollRef={scrollRef}
              community={community}
              detailedReactions={detailedReactions}
              emoji={emoji}
              msg={msg}
              myReactions={myReactions}
              key={emoji.emoji}
              onLongPress={() => setShowDetails(true)}
            />
          ))}
        </div>
      </div>
      {showDetails ? (
        <ReactionDetailsDialog
          detailedReactions={detailedReactions}
          isOpen={true}
          onClose={() => setShowDetails(false)}
        />
      ) : null}
    </>
  );
};

const ReactionButton = ({
  emoji,
  scrollRef,
  msg,
  community,
  detailedReactions,
  myReactions,
  onLongPress,
}: {
  emoji: {
    emoji: string;
    count: string;
  };
  scrollRef?: React.RefObject<HTMLDivElement>;
  msg: HomebaseFile<CommunityMessage>;
  community: HomebaseFile<CommunityDefinition>;
  detailedReactions: ReactionBase[] | undefined;
  myReactions: ReactionBase[] | undefined;
  onLongPress: (e?: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  const { mutate: addReaction } = useCommunityReaction().add;
  const { mutate: removeReaction } = useCommunityReaction().remove;

  const myReaction = myReactions?.find((reaction) => reaction.body === emoji.emoji);
  const authors = detailedReactions
    ?.filter((reaction) => reaction.body === emoji.emoji)
    .map((reaction) =>
      reaction.authorOdinId === loggedOnIdentity ? t('You') : reaction.authorOdinId
    );

  const clickProps = useLongPress(
    (e) => {
      if (!(isTouchDevice() && window.innerWidth < 1024)) return;

      e.stopPropagation();
      e.preventDefault();
      onLongPress(e);
    },
    () => {
      if (myReaction) removeReaction({ community, message: msg, reaction: myReaction });
      else addReaction({ community, message: msg, reaction: emoji.emoji });
    },
    { shouldPreventDefault: true },
    scrollRef
  );

  if (!emoji.count || emoji.count === '0') return null;

  return (
    <button
      className={`flex flex-row items-center gap-2 rounded-3xl border bg-background px-2 py-[0.1rem] shadow-sm hover:bg-primary hover:text-primary-contrast ${myReaction ? 'border-primary bg-primary/10 dark:bg-primary/60' : 'border-transparent'}`}
      {...clickProps}
      data-tooltip={`${authors?.length ? authors.join(', ') : ''} ${t('reacted with')} ${emoji.emoji}`}
    >
      <p>{emoji.emoji}</p>
      <p className="text-sm">{emoji.count}</p>
    </button>
  );
};

export const ReactionDetailsDialog = ({
  detailedReactions,

  isOpen,
  onClose,
}: {
  detailedReactions: ReactionBase[] | undefined;

  isOpen: boolean;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const [activeEmoji, setActiveEmoji] = useState<string>();

  const uniqueEmojis = useMemo(
    () =>
      Array.from(new Set(detailedReactions?.map((reaction) => reaction.body))).filter(
        (item, index, array) => array.indexOf(item) === index
      ),
    [detailedReactions]
  );

  useEffect(() => {
    if (uniqueEmojis?.length && !activeEmoji) {
      setActiveEmoji(uniqueEmojis?.[0]);
    }
  }, [uniqueEmojis]);

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={t('Reactions')}
      onClose={onClose}
      isSidePanel={false}
      isPaddingLess={true}
    >
      <ul className="flex flex-row bg-slate-100 px-4 dark:bg-slate-700 sm:px-8">
        {uniqueEmojis?.map((reaction, index) => {
          return (
            <li className="" key={reaction}>
              <ActionButton
                type="mute"
                className={`rounded-none border-b-primary hover:border-b-2 ${
                  activeEmoji === reaction || (!activeEmoji && index === 0) ? 'border-b-2' : ''
                }`}
                onClick={() => setActiveEmoji(reaction)}
              >
                {reaction}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-flow-row gap-4 px-4 py-4 sm:px-8">
        {detailedReactions
          ?.filter((reaction) => reaction.body === activeEmoji)
          .map((reaction) => {
            return (
              <div className="flex flex-row items-center text-lg" key={reaction.authorOdinId}>
                <AuthorImage odinId={reaction.authorOdinId} size="xs" className="mr-2" />
                <AuthorName odinId={reaction.authorOdinId} />
              </div>
            );
          })}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
