import { useRef, useState } from 'react';
import {
  SocialReactionsBar,
  t,
  useDotYouClient,
  useOutsideTrigger,
  useReaction,
} from '@youfoundation/common-app';

import { ReactionContext } from '@youfoundation/js-lib/public';
import { ErrorNotification } from '@youfoundation/common-app';

export const CommentLikeButton = ({ threadContext }: { threadContext: ReactionContext }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isReact, setIsReact] = useState(false);

  const { getIdentity } = useDotYouClient();
  const { mutateAsync: postReaction, error: postReactionError } = useReaction().saveEmoji;

  const isDesktop = document.documentElement.clientWidth >= 1024;
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

  const doLike = () => {
    postReaction({
      emojiData: {
        authorOdinId: getIdentity() || '',
        body: '❤️',
      },
      context: threadContext,
    });
  };

  return (
    <>
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
          className="text-primary ml-1 mr-1 text-opacity-80 hover:underline"
          onClick={() => {
            if (isDesktop) doLike();
            else setIsReact(!isReact);
          }}
          onMouseEnter={() => setIsReact(true)}
          onMouseLeave={() => setIsReact(false)}
        >
          {t('Like')}
        </button>
      </div>
      <ErrorNotification error={postReactionError} />
    </>
  );
};
