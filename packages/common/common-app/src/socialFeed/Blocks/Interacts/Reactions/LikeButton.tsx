import { useEffect, useRef, useState } from 'react';
import { ReactionContext } from '@homebase-id/js-lib/public';
import { t } from '../../../../helpers';
import {
  CanReactInfo,
  useReaction,
  useOutsideTrigger,
  useMyEmojiReactions,
  useIntersection,
  useOdinClientContext,
} from '../../../../hooks';
import { ErrorNotification } from '../../../../ui';
import { ReactionsBarHandle, SocialReactionsBar } from './ReactionsBar';
import { Heart, Lol, SolidSad, ThumbsUp } from '../../../../ui/Icons';
import { SolidHeart } from '../../../../ui/Icons/Heart';

export const LikeButton = ({
  context,
  onIntentToReact,
  canReact,
}: {
  context: ReactionContext;
  onIntentToReact?: () => void;
  canReact?: CanReactInfo;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isReact, setIsReact] = useState(false);
  const [isCustomReactOpen, setIsCustomReactOpen] = useState(false);

  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();
  const {
    saveEmoji: { mutate: postEmoji, error: postEmojiError },
    removeEmoji: { mutate: removeEmoji, error: removeEmojiError },
  } = useReaction();

  const isDesktop = document.documentElement.clientWidth >= 1024;
  const reactionsBarRef = useRef<ReactionsBarHandle>(null);
  useOutsideTrigger(wrapperRef, () => {
    setIsReact(false);
    reactionsBarRef.current?.close();
  });

  const [isInView, setIsInView] = useState(false);
  useIntersection(wrapperRef, () => setIsInView(true));

  const { data: myReactions } = useMyEmojiReactions(isInView ? context : undefined).fetch;
  const hasReacted = myReactions?.length;

  const doLike = () =>
    postEmoji({
      emojiData: {
        authorOdinId: loggedInIdentity,
        body: '❤️',
      },
      context,
    });

  const removeAny = () => {
    if (!myReactions) return;
    removeEmoji({
      emojiData: { body: myReactions[0], authorOdinId: loggedInIdentity },
      context,
    });
  };

  useEffect(() => {
    if (isReact && onIntentToReact) onIntentToReact();
  }, [isReact]);

  return (
    <>
      <ErrorNotification error={postEmojiError || removeEmojiError} />
      <div
        className={`relative select-none ${
          canReact && canReact.canReact !== true && canReact.canReact !== 'emoji'
            ? 'cursor-not-allowed'
            : ''
        } `}
        ref={wrapperRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wrapper div that holds a bigger "hover target", which spans the likeButton itself as well */}
        <div
          className={`${isReact || isCustomReactOpen ? 'absolute' : 'contents'} -left-2 -top-12 bottom-0 w-[10rem]`}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <SocialReactionsBar
            className={`absolute left-0 top-0`}
            isActive={isReact || isCustomReactOpen}
            context={context}
            canReact={canReact}
            onOpen={() => setIsCustomReactOpen(true)}
            onClose={() => setIsCustomReactOpen(false)}
            customDirection="right"
            ref={reactionsBarRef}
          />
        </div>
        <button
          className={`hover:text-black dark:hover:text-white ${
            isReact ? 'text-black dark:text-white' : ''
          } ${hasReacted ? 'cursor-pointer hover:opacity-10' : ''}`}
          onClick={() => {
            if (hasReacted) {
              removeAny();
              return;
            }

            if (isDesktop) doLike();
            else setIsReact(!isReact);
          }}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => !hasReacted && setIsReact(true)}
        >
          {myReactions?.length ? (
            <UIEmoji emoji={myReactions[0]} />
          ) : (
            <Heart className="mr-1 inline-block h-6 w-6" />
          )}
          <span className="sr-only">{t('Like')}</span>
        </button>
      </div>
    </>
  );
};

export const UIEmoji = ({ emoji: rawEmoji }: { emoji: string }) => {
  const emoji = rawEmoji.trim();
  if (emoji === '❤️') {
    return <SolidHeart className="mr-1 inline-block h-6 w-6" />;
  } else if (emoji === '👍️') {
    return <ThumbsUp className="mr-1 inline-block h-6 w-6" />;
  } else if (emoji === '😆' || emoji === '😂') {
    return <Lol className="mr-1 inline-block h-6 w-6" />;
  } else if (
    emoji === '😥' ||
    emoji === '🥲' ||
    emoji === '😢' ||
    emoji === '😭' ||
    emoji === '😿'
  ) {
    return <SolidSad className="mr-1 inline-block h-6 w-6" />;
  }

  return (
    <span
      className="mr-1 text-transparent"
      style={{
        textShadow: '0 0 0 rgb(var(--color-foreground) / var(--tw-text-opacity))',
      }}
    >
      {emoji}
    </span>
  );
};
