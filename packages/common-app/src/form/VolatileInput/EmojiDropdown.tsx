import { Database } from 'emoji-picker-element';
import { NativeEmoji } from 'emoji-picker-element/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMostSpace, usePortal } from '../../hooks';
const database = new Database();

const EmojiDropdown = ({
  query,
  onInput,
  position,
}: {
  query?: string;
  onInput: (emoji: string | undefined) => void;
  position?: { x: number; y: number };
}) => {
  const target = usePortal('emoji-container');

  const [emojis, setEmojis] = useState<NativeEmoji[]>();
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  useEffect(() => {
    (async () => {
      if (!query) return;
      setEmojis((await database.getEmojiBySearchQuery(query)) as NativeEmoji[]);
      setActiveIndex(0);
    })();
  }, [query]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') setActiveIndex((index) => index + 1);
      else if (event.key === 'ArrowUp') setActiveIndex((index) => index - 1);
      else if (event.key === 'Enter') onInput(emojis?.[activeIndex].unicode);
      else if (event.key === 'Tab') onInput(emojis?.[activeIndex].unicode);
      else return;

      event.stopPropagation();
      event.preventDefault();
    },
    [emojis, activeIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!query) return null;

  const dialog = (
    <div
      style={
        position
          ? { left: position.x, top: position.y, position: 'fixed', bottom: 'auto', height: '1rem' }
          : undefined
      }
      className="z-50"
      ref={wrapperRef}
    >
      <ul
        className={`bg-background text-foreground absolute flex flex-col overflow-hidden rounded-md py-2 shadow-md ${
          verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
        }
        ${horizontalSpace === 'left' ? 'right-0' : 'left-0'}`}
      >
        {emojis?.slice(0, 5)?.map((emoji, index) => (
          <li
            key={emoji.unicode}
            className={`flex cursor-pointer flex-row gap-2 px-2 transition-colors ${
              index === activeIndex
                ? 'bg-indigo-200 dark:bg-indigo-800'
                : 'hover:bg-indigo-200 dark:hover:bg-indigo-800'
            }`}
            onClick={() => {
              onInput(emoji.unicode);
              setEmojis([]);
            }}
          >
            <span>{emoji.unicode}</span>
            <span>:{emoji.shortcodes?.[0]}:</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return createPortal(dialog, target);
};
export default EmojiDropdown;
