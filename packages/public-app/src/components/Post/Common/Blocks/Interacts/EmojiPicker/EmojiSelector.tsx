import { useState, useRef, lazy, Suspense } from 'react';
import ActionButton from '../../../../../ui/Buttons/ActionButton';
import { Lol, useOutsideTrigger } from '@youfoundation/common-app';
const EmojiPicker = lazy(() => import('./EmojiPicker'));

const EmojiSelector = ({
  className,
  onInput,
}: {
  className?: string;
  onInput: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

  return (
    <div className={`relative ${className ?? ''}`}>
      <ActionButton
        type="mute"
        size="small"
        className={`text-foreground text-opacity-30 hover:text-opacity-100`}
        onClick={() => setIsOpen(!isOpen)}
        icon={Lol}
      />
      {isOpen ? (
        <div className="absolute bottom-[100%] right-[-2.7rem] sm:right-0" ref={wrapperRef}>
          <Suspense>
            <EmojiPicker
              onInput={(emojiDetail) => onInput(emojiDetail.unicode)}
              key={'emoji-picker'}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
};
export default EmojiSelector;
