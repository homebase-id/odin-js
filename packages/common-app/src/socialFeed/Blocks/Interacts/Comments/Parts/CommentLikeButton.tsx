import { useRef, useState } from 'react';
import {
  ReactionsBar,
  t,
  useDotYouClient,
  useOutsideTrigger,
  useReaction,
} from '@youfoundation/common-app';

import { ReactionContext } from '@youfoundation/js-lib/public';
import { ErrorNotification } from '@youfoundation/common-app';

const CommentLikeButton = ({ threadContext }: { threadContext: ReactionContext }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isReact, setIsReact] = useState(false);

  const { getIdentity } = useDotYouClient();
  const { mutateAsync: postReaction, error: postReactionError } = useReaction().saveEmoji;

  const isDesktop = document.documentElement.clientWidth >= 1024;
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

  const doLike = () => {
    console.log({
      authorOdinId: getIdentity() || '',
      content: { body: '❤️' },
      context: threadContext,
    });
    postReaction({
      authorOdinId: getIdentity() || '',
      content: { body: '❤️' },
      context: threadContext,
    });
  };

  return (
    <>
      <div className="relative" ref={wrapperRef}>
        {/* Wrapper div that holds a bigger "hover target", which spans the likeButton itself as well */}
        <div
          className={`${isReact ? 'absolute' : 'contents'} -left-1 -top-10 bottom-[100%] w-[10rem]`}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <ReactionsBar
            className="absolute left-0 top-0"
            isActive={isReact}
            context={threadContext}
            canReactDetails="ALLOWED"
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

export default CommentLikeButton;
