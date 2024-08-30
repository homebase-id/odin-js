import { ReactionContext } from '@homebase-id/js-lib/public';
import { Suspense, useEffect, useState, useRef } from 'react';
import { CanReactInfo } from '../../../../hooks/reactions/useCanReact';
import { useErrors } from '../../../../hooks/errors/useErrors';
import { useReaction } from '../../../../hooks/reactions/useReaction';
import { useDotYouClient } from '../../../../hooks/auth/useDotYouClient';
import { useMyEmojiReactions } from '../../../../hooks/reactions/emojis/useMyEmojiReactions';
import { CantReactInfo } from '../CantReactInfo';
import { useMostSpace } from '../../../../hooks/intersection/useMostSpace';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { Plus } from '../../../../ui/Icons';
import { t } from '../../../../helpers/i18n/dictionary';

export const SocialReactionsBar = ({
  className,
  isActive,
  context,
  canReact,
  onClose,
  customDirection,
}: {
  className: string;
  isActive: boolean;
  context: ReactionContext;
  canReact?: CanReactInfo;
  onClose: () => void;
  customDirection?: 'left' | 'right';
}) => {
  const [isHover, setIsHover] = useState(false);
  const addError = useErrors().add;

  const { getIdentity } = useDotYouClient();
  const {
    saveEmoji: { mutate: postEmoji, error: postEmojiError },
    removeEmoji: { mutate: removeEmoji, error: removeEmojiError },
  } = useReaction();

  const { data: myEmojis } = useMyEmojiReactions(isActive || isHover ? context : undefined).fetch;
  const doLike = async (body: string) => {
    postEmoji({
      emojiData: { body: body, authorOdinId: getIdentity() || '' },
      context,
    });

    if (onClose) {
      setIsHover(false);
      onClose();
    }
  };
  const doUnlike = (body: string) => {
    removeEmoji({
      emojiData: { body: body, authorOdinId: getIdentity() || '' },
      context,
    });

    if (onClose) {
      setIsHover(false);
      onClose();
    }
  };

  useEffect(() => {
    if (postEmojiError || removeEmojiError) {
      addError(postEmojiError || removeEmojiError);
    }
  }, [postEmojiError || removeEmojiError]);

  if (!isActive && !isHover) {
    return null;
  }

  if (!canReact || canReact?.canReact === false || canReact?.canReact === 'comment') {
    return (
      <div
        className={`bg-background text-foreground flex flex-row rounded-lg px-1 py-2 shadow-md dark:bg-slate-900 ${
          className ?? ''
        }`}
      >
        <CantReactInfo cantReact={canReact} intent="emoji" />
      </div>
    );
  }

  return (
    <ReactionsBar
      className={className}
      doLike={doLike}
      doUnlike={doUnlike}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      defaultValue={myEmojis || []}
      customDirection={customDirection}
    />
  );
};

const DEFAULT_EMOJIS = ['❤️', '😆', '😥'];

export const ReactionsBar = ({
  doLike,
  doUnlike,
  defaultValue,
  emojis,
  className,
  onMouseEnter,
  onMouseLeave,
  customDirection,
}: {
  doLike: (body: string) => void;
  doUnlike: (body: string) => void;
  defaultValue: string[];
  emojis?: string[];
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  customDirection?: 'left' | 'right';
}) => {
  const wrapperRef = useRef<HTMLButtonElement>(null);
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handleLike = (emoji: string) => {
    doLike(emoji);
    setIsCustomOpen(false);
  };

  const handleUnlike = (emoji: string) => {
    doUnlike(emoji);
    setIsCustomOpen(false);
  };

  return (
    <>
      <div
        className={`flex flex-row ${className || ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={() => {
          setIsCustomOpen(false);
          onMouseLeave?.();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {defaultValue?.length ? (
          defaultValue.map((emoji) => (
            <EmojiButton
              onClick={() => handleUnlike(emoji)}
              emoji={emoji}
              key={emoji}
              isActive={true}
            />
          ))
        ) : (
          <>
            {(emojis || DEFAULT_EMOJIS).map((emoji) => (
              <EmojiButton key={emoji} onClick={() => handleLike(emoji)} emoji={emoji} />
            ))}
          </>
        )}
        <span className="ml-2 mr-1 border-l border-l-slate-400 dark:border-r-slate-800"></span>
        <button
          className="scale-100 rounded-full p-1 text-center hover:bg-slate-300 hover:dark:bg-slate-700"
          title={t('Others')}
          onClick={() => setIsCustomOpen(true)}
          ref={wrapperRef}
        >
          <Plus className="h-6 w-6 " />
        </button>
        {isCustomOpen ? (
          <div
            className={`absolute z-20 ${verticalSpace === 'top' ? 'bottom-0' : 'top-0'} ${
              customDirection === 'right' || (!customDirection && horizontalSpace === 'right')
                ? 'left-0'
                : 'right-0'
            } overflow-hidden rounded-lg`}
          >
            <Suspense>
              <EmojiPicker
                onInput={(emojiDetail) => {
                  handleLike(emojiDetail.unicode);
                  setIsCustomOpen(false);
                }}
                key={'emoji-picker'}
              />
            </Suspense>
          </div>
        ) : null}
      </div>
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
