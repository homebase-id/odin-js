import { useRef, useState } from 'react';

import { ReactionContext } from '@homebase-id/js-lib/public';
import { useDotYouClient } from '../../../../../hooks/auth/useDotYouClient';
import { useReaction } from '../../../../../hooks/reactions/useReaction';
import { useOutsideTrigger } from '../../../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import { SocialReactionsBar } from '../../Reactions/ReactionsBar';
import { ErrorNotification } from '../../../../../ui/Alert/ErrorNotification';
import { t } from '../../../../../helpers/i18n/dictionary';
import { useMyEmojiReactions } from '../../../../../hooks';

export const CommentLikeButton = ({ threadContext }: { threadContext: ReactionContext }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isReact, setIsReact] = useState(false);

  const { getIdentity } = useDotYouClient();
  const {
    saveEmoji: { mutate: postEmoji, error: postEmojiError },
    removeEmoji: { mutate: removeEmoji, error: removeEmojiError },
  } = useReaction();
  const isDesktop = document.documentElement.clientWidth >= 1024;
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

  const { data: myReactions } = useMyEmojiReactions(threadContext).fetch;
  const hasReacted = myReactions?.length;

  const doLike = () => {
    postEmoji({
      emojiData: {
        authorOdinId: getIdentity() || '',
        body: '❤️',
      },
      context: threadContext,
    });
  };

  const removeAny = () => {
    if (!myReactions) return;
    removeEmoji({
      emojiData: { body: myReactions[0], authorOdinId: getIdentity() || '' },
      context: threadContext,
    });
  };

  return (
    <>
      <ErrorNotification error={postEmojiError || removeEmojiError} />
      <div className={`relative select-none`} ref={wrapperRef}>
        {/* Wrapper div that holds a bigger "hover target", which spans the likeButton itself as well */}
        <div
          className={`${isReact ? 'absolute' : 'contents'} -left-1 -top-10 bottom-0 w-[10rem]`}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <SocialReactionsBar
            className="absolute left-0 top-0"
            customDirection="right"
            isActive={isReact}
            context={threadContext}
            // Forced to yes, as this component won't render if the user can't react
            canReact={{ canReact: true }}
            onClose={() => setIsReact(false)}
          />
        </div>
        <button
          className={`text-primary ml-1 mr-1 text-opacity-80 hover:underline ${hasReacted ? 'font-bold' : 'font-normal'}`}
          onClick={() => {
            if (hasReacted) {
              removeAny();
              return;
            }

            if (isDesktop) doLike();
            else setIsReact(!isReact);
          }}
          onMouseEnter={() => !hasReacted && setIsReact(true)}
          onMouseLeave={() => setIsReact(false)}
        >
          {t('Like')}
        </button>
      </div>
    </>
  );
};