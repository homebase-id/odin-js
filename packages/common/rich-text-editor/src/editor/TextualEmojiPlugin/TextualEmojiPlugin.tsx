import { deleteText } from '@udecode/plate-common';
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
        const { selection, insertText } = editor;
        if (!selection) return;
        const [node] = editor.node(selection.anchor.path);

        if (!node || !('text' in node)) return;
        const textContent = node.text;
        const match = Object.keys(emojiMap).find((key) => textContent.endsWith(key));

        if (!match) return;

        const emoji = emojiMap[match];
        deleteText(editor, {
          at: {
            anchor: {
              path: selection.anchor.path,
              offset: textContent.length - match.length,
            },
            focus: selection.anchor,
          },
        });
        insertText(emoji);
      }
    },
  },
});
