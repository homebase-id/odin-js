import { useEffect, useState } from 'react';
import useAuth from '../../../../../../../hooks/auth/useAuth';
import useReaction from '../../../../../../../hooks/reactions/useReaction';
import useLongPress from '../../../../../../../hooks/longPress/useLongPress';
import Heart from '../../../../../../ui/Icons/Heart/Heart';
import ReactionsBar from '../ReactionsBar/ReactionsBar';
import { ReactionContext } from '@youfoundation/js-lib';
import ErrorNotification from '../../../../../../ui/Alerts/ErrorNotification/ErrorNotification';
import { CanReactDetails } from '../../../../../../../hooks/reactions/useCanReact';

const LikeButton = ({
  context,
  onIntentToReact,
  canReactDetails,
}: {
  context: ReactionContext;
  onIntentToReact?: () => void;
  canReactDetails: CanReactDetails;
}) => {
  const [isReact, setIsReact] = useState(false);

  const { getIdentity } = useAuth();
  const { mutateAsync: postEmoji, error: postEmojiError } = useReaction().saveEmoji;

  const doLike = () => {
    // To build
    postEmoji({
      authorOdinId: getIdentity() || '',
      content: {
        body: '❤️',
      },
      context,
    });
  };

  const longPressEvent = useLongPress(() => setIsReact(true), doLike);

  useEffect(() => {
    if (isReact && onIntentToReact) {
      onIntentToReact();
    }
  }, [isReact]);

  return (
    <>
      <div
        className={`relative ${
          canReactDetails && canReactDetails !== 'ALLOWED' ? 'cursor-not-allowed' : ''
        } `}
      >
        {/* Wrapper div that holds a bigger "hover target", which spans the likeButton itself as well */}
        <div
          className={`${isReact ? 'absolute' : 'contents'} -left-2 -top-12 bottom-0 w-[10rem]`}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <ReactionsBar
            className={`absolute left-0 top-0`}
            isActive={isReact}
            context={context}
            canReactDetails={canReactDetails}
          />
        </div>
        <button
          className={`hover:text-black dark:hover:text-white ${
            isReact ? 'text-black dark:text-white' : ''
          }`}
          {...longPressEvent}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <Heart className="mr-1 inline-block h-6 w-6" />
        </button>
      </div>
      <ErrorNotification error={postEmojiError} />
    </>
  );
};

export default LikeButton;
