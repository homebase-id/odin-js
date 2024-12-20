import 'emoji-picker-element';
import React, { useEffect } from 'react';
import { IS_DARK_CLASSNAME } from '../../../../hooks/darkMode/useDarkMode';
import { Database } from 'emoji-picker-element';

interface EmojiPickerElement extends HTMLElement {
  skinToneEmoji: string;
  dataSource: string;
}

interface EmojiDetail {
  unicode: string;
  tags: string[];
  skins?: { tone: number; unicode: string }[];
  skintone?: number;
}

interface EmojiEvent {
  detail: {
    emoji: EmojiDetail;
  };
}

const database = new Database();

export const EmojiPicker = ({ onInput }: { onInput: (val: EmojiDetail) => void }) => {
  const ref = React.useRef<EmojiPickerElement>(null);
  const isDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

  useEffect(() => {
    if (!ref.current) return;

    const searchInput = ref.current.shadowRoot?.getElementById('search');
    searchInput?.focus();

    const handler: EventListener = async (event) => {
      const emojiDetail = (event as unknown as EmojiEvent).detail.emoji;

      const skintone = await database.getPreferredSkinTone();
      const unicode =
        (emojiDetail.skins && skintone
          ? emojiDetail.skins.find((skin) => skin.tone === skintone)?.unicode
          : undefined) || emojiDetail.unicode;

      onInput({
        ...emojiDetail,
        unicode: unicode,
        skintone,
      });
    };

    ref.current.addEventListener('emoji-click', handler);
    ref.current.skinToneEmoji = '👍';
    ref.current.dataSource = '/emoji/emoji-data.json';

    const style = document.createElement('style');
    style.textContent = `.favorites{display:none}`;
    ref.current?.shadowRoot?.appendChild(style);

    return () => {
      ref.current?.removeEventListener('emoji-click', handler);
    };
  }, []);

  return React.createElement('emoji-picker', {
    ref,
    class: `${isDarkMode ? 'dark' : 'light'} max-h-[20rem]`,
    style: {
      '--background': isDarkMode ? 'rgb(0 0 0)' : `rgb(255 255 255)`,
      '--category-emoji-size': '1.125rem',
      '--border-radius': '0.375rem',
      '--border-color': isDarkMode ? 'rgb(30 41 59)' : '#f3f4f6',
      '--input-border-color': isDarkMode ? 'rgb(30 41 59)' : '#f3f4f6',
    },
  });
};
