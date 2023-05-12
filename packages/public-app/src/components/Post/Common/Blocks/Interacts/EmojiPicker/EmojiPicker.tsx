import { IS_DARK_CLASSNAME } from '@youfoundation/common-app';
import 'emoji-picker-element';
import React, { useEffect } from 'react';

interface EmojiPickerElement extends HTMLElement {
  skinToneEmoji: string;
}

interface EmojiDetail {
  unicode: string;
}

interface EmojiEvent {
  detail: {
    emoji: EmojiDetail;
  };
}

const EmojiPicker = ({ onInput }: { onInput: (val: EmojiDetail) => void }) => {
  const ref = React.useRef<EmojiPickerElement>(null);
  const isDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

  useEffect(() => {
    if (ref.current) {
      const handler: EventListener = (event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emojiDetail = (event as any as EmojiEvent).detail.emoji;
        onInput(emojiDetail);
      };

      ref.current.addEventListener('emoji-click', handler);
      ref.current.skinToneEmoji = '👍';

      const style = document.createElement('style');
      style.textContent = `.favorites{display:none}`;
      ref.current?.shadowRoot?.appendChild(style);

      return () => {
        ref.current?.removeEventListener('emoji-click', handler);
      };
    }
  }, []);

  return React.createElement('emoji-picker', {
    ref,
    class: `${isDarkMode ? 'dark' : 'light'} max-h-[20rem]`,
    style: { '--category-emoji-size': '1.125rem' },
  });
};

export default EmojiPicker;
