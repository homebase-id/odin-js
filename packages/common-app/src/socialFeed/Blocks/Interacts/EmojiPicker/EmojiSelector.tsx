import { useState, useRef, Suspense, useEffect } from 'react';
import { useOutsideTrigger, useMostSpace } from '../../../../hooks';
import { ActionButton, Lol } from '../../../../ui';
import { EmojiPicker } from './EmojiPicker';

export const EmojiSelector = ({
  className,
  wrapperClassName,
  onInput,
  defaultValue,
  size,
  isOpen: isDefaultOpen,
  onClose,
}: {
  className?: string;
  wrapperClassName?: string;
  onInput: (val: string) => void;
  defaultValue?: string;
  size?: 'large' | 'small' | 'square' | 'none';
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(!!isDefaultOpen);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  useEffect(() => setIsOpen(!!isDefaultOpen), [isDefaultOpen]);
  useEffect(() => (!isOpen && onClose ? onClose() : undefined), [isOpen]);

  return (
    <div
      className={wrapperClassName || `relative`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
    >
      <ActionButton
        type="mute"
        size={size}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        icon={defaultValue ? undefined : Lol}
        children={defaultValue || null}
      />
      <div
        className={`absolute ${verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'} ${
          horizontalSpace === 'left' ? 'right-[-2.7rem] sm:right-0' : 'left-[-2.7rem] sm:left-0'
        }  z-20 `}
        onClick={(e) => e.stopPropagation()}
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
