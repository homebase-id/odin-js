import { withTriggerCombobox } from '@udecode/plate-combobox';
import { createPlatePlugin } from '@udecode/plate-core/react';
import { EmojiDropdownInputElement } from './EmojiDropdownInputElement';

export const ELEMENT_EMOJI = 'emoji';
export const ELEMENT_EMOJI_INPUT = 'emoji_input';

export const EmojiInputPlugin = createPlatePlugin({
  key: ELEMENT_EMOJI_INPUT,
  node: { isElement: true, isInline: true },
  render: {
    node: EmojiDropdownInputElement,
  },
  handlers: {
    // We prevent the default behavior of the Enter key when the selection is in a
    //   channel input; So we can avoid the onKeyDown handler on PlateContent to trigger;
    // And allow the input component to actually handle it on the document level
    onKeyDown: ({ editor, event }) => {
      if (event.key !== 'Enter') return;

      const selection = editor.selection;
      if (!selection) return;

      const [node] = editor.api.node(selection) || [];
      if (!node) return;
      if (node.type === ELEMENT_EMOJI_INPUT) {
        event.preventDefault();
      }

      const [parent] = editor.api.parent(selection) || [];
      if (!parent) return;
      if (parent.type === ELEMENT_EMOJI_INPUT) {
        event.preventDefault();
      }
    },
  },
});

/** Enables support for autocompleting @channels. */
export const EmojiPlugin = createPlatePlugin({
  key: ELEMENT_EMOJI,

  // extendEditor: withTriggerCombobox as any,
  node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },
  options: {
    createComboboxInput: () => ({
      children: [{ text: '' }],
      trigger: ':',
      type: EmojiInputPlugin.key,
    }),
    trigger: ':',
    triggerPreviousCharPattern: /^\s?$/,
  },
  plugins: [EmojiInputPlugin],
})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .overrideEditor(withTriggerCombobox as any);
