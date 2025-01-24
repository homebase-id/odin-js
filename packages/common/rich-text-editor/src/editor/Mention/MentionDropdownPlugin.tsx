import { withTriggerCombobox } from '@udecode/plate-combobox';
import { createPlatePlugin } from '@udecode/plate-core/react';
import { MentionDropdownInputElement } from './MentionDropdownInputElement';
import { MentionDropdownElement } from './MentionDropdownElement';
import { TElement } from '@udecode/plate';
import { DropdownValue } from '../Dropdown/RTEDropdown';

export const ELEMENT_MENTION = 'mention';
export const ELEMENT_MENTION_INPUT = 'mention_input';
export interface TMentionElement extends TElement {
  value: string;
  uniqueId: string;
}

export type Mentionable = DropdownValue;

export const MentionInputPlugin = createPlatePlugin({
  key: ELEMENT_MENTION_INPUT,
  node: { isElement: true, isInline: true },
  render: {
    node: MentionDropdownInputElement,
  },
  handlers: {
    // We prevent the default behavior of the Enter key when the selection is in a
    //   channel input; So we can avoid the onKeyDown handler on PlatContent to trigger;
    // And allow the input component to actually handle it on the document level
    onKeyDown: ({ editor, event }) => {
      if (event.key !== 'Enter') return;

      const selection = editor.selection;
      if (!selection) return;

      const [node] = editor.api.node(selection) || [];
      if (!node) return;
      if (node.type === ELEMENT_MENTION_INPUT) {
        event.preventDefault();
      }

      const [parent] = editor.api.parent(selection) || [];
      if (!parent) return;
      if (parent.type === ELEMENT_MENTION_INPUT) {
        event.preventDefault();
      }
    },
  },
});

/** Enables support for autocompleting @channels. */
export const MentionPlugin = createPlatePlugin({
  key: ELEMENT_MENTION,

  // extendEditor: withTriggerCombobox as any,
  node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },
  options: {
    createComboboxInput: () => ({
      children: [{ text: '' }],
      trigger: '@',
      type: MentionInputPlugin.key,
    }),
    trigger: '@',
    triggerPreviousCharPattern: /^\s?$/,
  },
  plugins: [MentionInputPlugin],
  render: {
    node: MentionDropdownElement,
  },
})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .overrideEditor(withTriggerCombobox as any);
