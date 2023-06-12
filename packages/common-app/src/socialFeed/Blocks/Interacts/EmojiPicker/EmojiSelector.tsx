import { useState, useRef, lazy, Suspense } from 'react';

import { ActionButton, Lol, useMostSpace, useOutsideTrigger } from '@youfoundation/common-app';
const EmojiPicker = lazy(() =>
  import('./EmojiPicker').then((mod) => ({ default: mod.EmojiPicker }))
);

export const EmojiSelector = ({
  className,
  onInput,
}: {
  className?: string;
  onInput: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const { verticalSpace } = useMostSpace(wrapperRef);

  return (
    <div className={`relative ${className ?? ''}`}>
      <ActionButton
        type="mute"
        size="small"
        className={`text-foreground text-opacity-30 hover:text-opacity-100`}
        onClick={() => setIsOpen(!isOpen)}
        icon={Lol}
      />
      <div
        className={`absolute ${
          verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
        } right-[-2.7rem] z-20 sm:right-0`}
        ref={wrapperRef}
      >
        {isOpen ? (
          <Suspense>
            <EmojiPicker
              onInput={(emojiDetail) => onInput(emojiDetail.unicode)}
              key={'emoji-picker'}
            />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
};
