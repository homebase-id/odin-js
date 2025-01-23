import { TText } from '@udecode/plate';
import { createPlatePlugin } from '@udecode/plate-core/react';

// Emoji mapping
const emojiMap: Record<string, string> = {
  ':-)': '😊',
  ';-)': '😉',
  ':-D': '😃',
  ':-P': '😜',
  ':-(': '☹️',
  ':-O': '😮',
};

export const TextualEmojiPlugin = createPlatePlugin({
  key: 'textual-emoji',
  handlers: {
    onKeyDown: ({ editor, event }) => {
      if (event.key === ' ') {
        const { selection } = editor;
        if (!selection) return;
        const [node] = editor.api.node({ at: selection.anchor.path }) || [];

        if (!node || !('text' in node)) return;
        const textContent = (node as TText).text;
        const match = Object.keys(emojiMap).find((key) => textContent.endsWith(key));

        if (!match) return;

        const emoji = emojiMap[match];
        editor.tf.delete({
          at: {
            anchor: {
              path: selection.anchor.path,
              offset: textContent.length - match.length,
            },
            focus: selection.anchor,
          },
        });
        editor.tf.insertText(emoji);
      }
    },
  },
});
