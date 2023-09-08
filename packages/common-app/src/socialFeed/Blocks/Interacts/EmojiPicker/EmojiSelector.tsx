import { useState, useRef, lazy, Suspense } from 'react';

import { ActionButton, Lol, useMostSpace, useOutsideTrigger } from '@youfoundation/common-app';
const EmojiPicker = lazy(() =>
  import('./EmojiPicker').then((mod) => ({ default: mod.EmojiPicker }))
);

export const EmojiSelector = ({
  className,
  onInput,
  defaultValue,
  size,
}: {
  className?: string;
  onInput: (val: string) => void;
  defaultValue?: string;
  size?: 'large' | 'small' | 'square' | 'none';
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  return (
    <div className={`relative ${className ?? ''}`}>
      <ActionButton
        type="mute"
        size={size}
        className={`text-foreground ${
          defaultValue ? 'text-opacity-70' : 'text-opacity-30'
        } hover:text-opacity-100`}
        onClick={() => setIsOpen(!isOpen)}
        icon={defaultValue ? undefined : Lol}
        children={defaultValue || null}
      />
      <div
        className={`absolute ${verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'} ${
          horizontalSpace === 'left' ? 'right-[-2.7rem] sm:right-0' : 'left-[-2.7rem] sm:left-0'
        }  z-20 `}
        ref={wrapperRef}
      >
        {isOpen ? (
          <Suspense>
            <EmojiPicker
              onInput={(emojiDetail) => {
                onInput(emojiDetail.unicode);
                setIsOpen(false);
              }}
              key={'emoji-picker'}
            />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
};
