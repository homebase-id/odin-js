import { createPlatePlugin } from '@udecode/plate-core/react';
import { getPlainTextFromRichText } from '../../../../common-app/src';
import { RichTextNode } from '@homebase-id/js-lib/core';

// Emoji mapping
const plainEmojiMap: Record<string, string> = {
  ':-)': '😊',
  ';-)': '😉',
  ':-D': '😃',
  ':-d': '😃',
  ':-P': '😜',
  ':-p': '😜',
  ':-(': '☹️',
  ':-O': '😮',
  ':-o': '😮',
};

const emojiMap: Record<string, string> = (() => {
  const map: Record<string, string> = { ...plainEmojiMap };
  Object.entries(plainEmojiMap).forEach(([key, value]) => {
    map[key + ' '] = value + ' ';
  });
  return map;
})();

export const TextualEmojiPlugin = createPlatePlugin({
  key: 'textual-emoji',
  handlers: {
    onKeyDown: ({ editor, event }) => {
      if (event.key === ' ') {
        // Set timeout to allow the input plugin to update the editor state first
        setTimeout(() => {
          const selection = editor.selection;
          if (!selection) return;
          const fullNode = editor.api.node({ at: selection.anchor.path }) || [];

          const [node] = fullNode;
          if (!node) return;

          const plainText = getPlainTextFromRichText(node?.children as RichTextNode[]);
          if (!plainText) return;
          const match = Object.keys(emojiMap).find((key) => plainText.endsWith(key));

          if (!match) return;

          const emoji = emojiMap[match];
          editor.tf.delete({
            at: {
              anchor: {
                path: selection.anchor.path,
                offset: plainText.length - match.length,
              },
              focus: selection.anchor,
            },
          });
          editor.tf.insertText(emoji);
        }, 0);
      }
    },
  },
});
