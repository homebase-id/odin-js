import { ReactionContext } from '@youfoundation/js-lib';
import { Suspense, useEffect, useState } from 'react';
import {
  CanReactDetails,
  EmojiPicker,
  t,
  useDotYouClient,
  useErrors,
  useMyEmojiReactions,
  useReaction,
} from '@youfoundation/common-app';
import { Plus } from '@youfoundation/common-app';

export const ReactionsBar = ({
  className,
  isActive,
  context,
  canReactDetails,
  onClose,
}: {
  className: string;
  isActive: boolean;
  context: ReactionContext;
  canReactDetails: CanReactDetails;
  onClose: () => void;
}) => {
  const [isHover, setIsHover] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const addError = useErrors().add;

  const { getIdentity } = useDotYouClient();
  const {
    saveEmoji: { mutate: postEmoji, error: postEmojiError },
    removeEmoji: { mutate: removeEmoji, error: removeEmojiError },
  } = useReaction();

  const { data: myEmojis } = useMyEmojiReactions(isActive || isHover ? context : undefined).fetch;
  const doLike = async (body: string) => {
    postEmoji({
      authorOdinId: getIdentity() || '',
      content: { body: body },
      context,
    });

    if (onClose) {
      onClose();
      setIsCustomOpen(false);
      setIsHover(false);
    }
  };
  const doUnlike = (body: string) => {
    removeEmoji({
      authorOdinId: getIdentity() || '',
      content: { body: body },
      context,
    });

    if (onClose) {
      onClose();
      setIsCustomOpen(false);
      setIsHover(false);
    }
  };

  useEffect(() => {
    if (!isHover) {
      setIsCustomOpen(false);
    }
  }, [isHover]);

  useEffect(() => {
    if (postEmojiError || removeEmojiError) {
      addError(postEmojiError || removeEmojiError);
    }
  }, [postEmojiError || removeEmojiError]);

  if (!isActive && !isHover) {
    return null;
  }

  if (canReactDetails && canReactDetails !== 'ALLOWED') {
    return (
      <div
        className={`bg-background text-foreground flex flex-row rounded-lg px-1 py-2 shadow-md dark:bg-slate-900 ${
          className ?? ''
        }`}
      >
        <p className="text-foreground text-sm italic text-opacity-50">
          {canReactDetails === 'NOT_AUTHENTICATED' &&
            t('Reactions are disabled for anonymous users')}
          {canReactDetails === 'NOT_AUTHORIZED' &&
            t('You do not have the necessary access to react on this post')}
          {canReactDetails === 'DISABLED_ON_POST' && t('Reactions are disabled on this post')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-background text-foreground flex flex-row rounded-lg px-1 py-2 shadow-md dark:bg-slate-900 ${
          className ?? ''
        }`}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        {myEmojis?.length ? (
          myEmojis.map((emoji) => (
            <EmojiButton
              onClick={() => doUnlike(emoji)}
              emoji={emoji}
              key={emoji}
              isActive={true}
            />
          ))
        ) : (
          <>
            <EmojiButton onClick={() => doLike('❤️')} emoji={'❤️'} />
            <EmojiButton onClick={() => doLike('😆')} emoji={'😆'} />
            <EmojiButton onClick={() => doLike('😥')} emoji={'😥'} />
          </>
        )}
        <span className="ml-2 mr-1 border-l border-l-slate-400 dark:border-r-slate-800"></span>
        <button
          className="scale-100 rounded-full p-1 text-center hover:bg-slate-300 hover:dark:bg-slate-700"
          title={t('Others')}
          onClick={() => setIsCustomOpen(true)}
        >
          <Plus className="h-6 w-6 " />
        </button>
        {isCustomOpen ? (
          <div className="absolute bottom-0 left-0 overflow-hidden rounded-lg">
            <Suspense>
              <EmojiPicker
                onInput={(emojiDetail) => {
                  doLike(emojiDetail.unicode);
                  setIsCustomOpen(false);
                  setIsHover(false);
                }}
                key={'emoji-picker'}
              />
            </Suspense>
          </div>
        ) : null}
      </div>
      {/* <ErrorNotification error={postEmojiError || removeEmojiError} /> */}
    </>
  );
};

const EmojiButton = ({
  emoji,
  onClick,
  isActive,
}: {
  emoji: string;
  onClick: () => void;
  isActive?: boolean;
}) => {
  return (
    <button
      className={`mr-[0.125rem] h-8 w-8 rounded-full  p-1 text-center text-xl last-of-type:-mr-0 ${
        isActive
          ? 'bg-slate-300 dark:bg-slate-700'
          : 'bg-transparent hover:bg-slate-300 hover:dark:bg-slate-700'
      }`}
      title={t('Like')}
      onClick={onClick}
      key={emoji}
    >
      {emoji}
    </button>
  );
};
