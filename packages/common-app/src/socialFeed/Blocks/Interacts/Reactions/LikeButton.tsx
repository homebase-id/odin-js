import { useEffect, useRef, useState } from 'react';
import { ReactionContext } from '@homebase-id/js-lib/public';
import { t } from '../../../../helpers';
import { CanReactInfo, useDotYouClient, useReaction, useOutsideTrigger } from '../../../../hooks';
import { ErrorNotification } from '../../../../ui';
import { SocialReactionsBar } from './ReactionsBar';
import { Heart } from '../../../../ui/Icons';

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

  const { getIdentity } = useDotYouClient();
  const { mutateAsync: postEmoji, error: postEmojiError } = useReaction().saveEmoji;

  const isDesktop = document.documentElement.clientWidth >= 1024;
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

  const doLike = () =>
    postEmoji({
      emojiData: {
        authorOdinId: getIdentity() || '',
        body: '❤️',
      },
      context,
    });

  useEffect(() => {
    if (isReact && onIntentToReact) onIntentToReact();
  }, [isReact]);

  return (
    <>
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
          className={`${isReact ? 'absolute' : 'contents'} -left-2 -top-12 bottom-0 w-[10rem]`}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <SocialReactionsBar
            className={`absolute left-0 top-0`}
            isActive={isReact}
            context={context}
            canReact={canReact}
            onClose={() => setIsReact(false)}
            customDirection="right"
          />
        </div>
        <button
          className={`hover:text-black dark:hover:text-white ${
            isReact ? 'text-black dark:text-white' : ''
          }`}
          onClick={() => {
            if (isDesktop) doLike();
            else setIsReact(!isReact);
          }}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <Heart className="mr-1 inline-block h-6 w-6" />
          <span className="sr-only">{t('Like')}</span>
        </button>
      </div>
      <ErrorNotification error={postEmojiError} />
    </>
  );
};
