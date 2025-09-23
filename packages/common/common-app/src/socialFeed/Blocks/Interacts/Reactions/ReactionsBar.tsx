import { createPortal } from 'react-dom';
import { ReactionContext } from '@homebase-id/js-lib/public';
import { Suspense, useEffect, useState, useRef, forwardRef, Ref, useImperativeHandle } from 'react';
import { CanReactInfo } from '../../../../hooks/reactions/useCanReact';
import { useErrors } from '../../../../hooks/errors/useErrors';
import { useReaction } from '../../../../hooks/reactions/useReaction';
import { useMyEmojiReactions } from '../../../../hooks/reactions/emojis/useMyEmojiReactions';
import { CantReactInfo } from '../CantReactInfo';
import { useMostSpace } from '../../../../hooks/intersection/useMostSpace';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { Emojis } from '../../../../ui/Icons';
import { t } from '../../../../helpers/i18n/dictionary';
import { useDotYouClientContext, usePortal } from '../../../../hooks';

export const SocialReactionsBar = forwardRef(
  (
    {
      className,
      isActive,
      context,
      canReact,
      onOpen,
      onClose,
      customDirection,
    }: {
      className: string;
      isActive: boolean;
      context: ReactionContext;
      canReact?: CanReactInfo;
      onOpen: () => void;
      onClose: () => void;
      customDirection?: 'left' | 'right';
    },
    ref: Ref<ReactionsBarHandle>
  ) => {
    const [isHover, setIsHover] = useState(false);
    const addError = useErrors().add;

    const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
    const {
      saveEmoji: { mutate: postEmoji, error: postEmojiError },
      removeEmoji: { mutate: removeEmoji, error: removeEmojiError },
    } = useReaction();

    const { data: myEmojis } = useMyEmojiReactions(isActive || isHover ? context : undefined).fetch;
    const doLike = async (body: string) => {
      postEmoji({
        emojiData: { body: body, authorOdinId: loggedOnIdentity },
        context,
      });

      if (onClose) {
        setIsHover(false);
        onClose();
      }
    };
    const doUnlike = (body: string) => {
      removeEmoji({
        emojiData: { body: body, authorOdinId: loggedOnIdentity },
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

    if (!isActive && !isHover) return null;

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
        className={`bg-background text-foreground flex flex-row rounded-lg px-1 py-2 shadow-md dark:bg-slate-900 ${className || ''}`}
        doLike={doLike}
        doUnlike={doUnlike}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        defaultValue={myEmojis || []}
        customDirection={customDirection}
        ref={ref}
        onOpen={onOpen}
        onClose={onClose}
      />
    );
  }
);
SocialReactionsBar.displayName = 'SocialReactionsBar';

const DEFAULT_EMOJIS = ['❤️', '😆', '😥'];

export type ReactionsBarHandle = {
  close: () => void;
};
export const ReactionsBar = forwardRef(
  (
    {
      doLike,
      doUnlike,
      defaultValue,
      emojis,
      className,
      onClick,
      onMouseEnter,
      onMouseLeave,
      customDirection,
      onOpen,
      onClose,
    }: {
      doLike: (body: string) => void;
      doUnlike: (body: string) => void;
      defaultValue: string[];
      emojis?: string[];
      className?: string;
      onClick?: () => void;
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
      onOpen?: () => void;
      onClose?: () => void;
      customDirection?: 'left' | 'right';
    },
    ref: Ref<ReactionsBarHandle>
  ) => {
    const wrapperRef = useRef<HTMLButtonElement>(null);
    const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const target = usePortal('emoji-picker');

    useImperativeHandle(
      ref,
      () => ({
        close() {
          setIsCustomOpen(false);
        },
      }),
      []
    );

    useEffect(() => {
      if (isCustomOpen && onOpen) onOpen();
      if (!isCustomOpen && onClose) onClose();
    }, [isCustomOpen]);

    const handleLike = (emoji: string) => {
      doLike(emoji);
      setIsCustomOpen(false);
    };

    const handleUnlike = (emoji: string) => {
      doUnlike(emoji);
      setIsCustomOpen(false);
    };

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsCustomOpen(false);
      };

      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
      <>
        <div
          className={`flex flex-row ${className || ''}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {defaultValue?.length ? (
            defaultValue.map((emoji) => (
              <EmojiButton
                onClick={() => {
                  handleUnlike(emoji);
                  onClick?.();
                }}
                emoji={emoji}
                key={emoji}
                isActive={true}
              />
            ))
          ) : (
            <>
              {(emojis || DEFAULT_EMOJIS).map((emoji) => (
                <EmojiButton
                  key={emoji}
                  onClick={() => {
                    handleLike(emoji);
                    onClick?.();
                  }}
                  emoji={emoji}
                />
              ))}
            </>
          )}
          <button
            className="flex-shrink-0 scale-100 rounded-full p-2 text-slate-400 text-center hover:bg-slate-300 hover:dark:bg-slate-700"
            title={t('Others')}
            onClick={() => {
              setIsCustomOpen(true);
            }}
            ref={wrapperRef}
          >
            <Emojis className="h-5 w-5" />
          </button>
          {isCustomOpen
            ? createPortal(
                <div
                  className={`shadow-md z-20 overflow-hidden rounded-lg`}
                  style={{
                    position: 'fixed',
                    ...(verticalSpace === 'top'
                      ? {
                          bottom:
                            window.innerHeight -
                            (wrapperRef.current?.getBoundingClientRect().bottom || 0),
                        }
                      : { top: wrapperRef.current?.getBoundingClientRect().top || 0 }),

                    ...(customDirection === 'right' ||
                    (!customDirection && horizontalSpace === 'right')
                      ? {
                          left: wrapperRef.current?.getBoundingClientRect().left || 0,
                        }
                      : {
                          right:
                            window.innerWidth -
                            (wrapperRef.current?.getBoundingClientRect().right || 0),
                        }),
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseDownCapture={(e) => e.stopPropagation()}
                >
                  <Suspense>
                    <EmojiPicker
                      onInput={(emojiDetail) => {
                        if (defaultValue?.includes(emojiDetail.unicode))
                          handleUnlike(emojiDetail.unicode);
                        handleLike(emojiDetail.unicode);
                        setIsCustomOpen(false);
                      }}
                      key={'emoji-picker'}
                    />
                  </Suspense>
                </div>,
                target
              )
            : null}
        </div>
      </>
    );
  }
);
ReactionsBar.displayName = 'ReactionsBar';

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
      className={`mr-[0.125rem] h-8 w-8 rounded-full flex-shrink-0 p-1 text-center text-xl last-of-type:-mr-0 ${
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
