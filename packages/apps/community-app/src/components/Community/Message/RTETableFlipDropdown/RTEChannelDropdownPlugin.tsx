import { withTriggerCombobox } from '@udecode/plate-combobox';
import { createPlatePlugin } from '@udecode/plate-core/react';
import { TElement } from '@udecode/plate';
import {RTETableFlipDropdownInputElement} from "./RTETableFlipDropdownInputElement";
import {RTETableFlipDropdownElement} from "./RTETableFlipDropdownElement";

export const ELEMENT_CHANNEL = 'table_flip';
export const ELEMENT_CHANNEL_INPUT = 'table_flip_input';
export interface TChannelElement extends TElement {
  value: string;
  uniqueId: string;
}

export const TableFlipInputPlugin = createPlatePlugin({
  key: ELEMENT_CHANNEL_INPUT,
  node: { isElement: true, isInline: true },
  render: {
    node: RTETableFlipDropdownInputElement,
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
      if (node.type === ELEMENT_CHANNEL_INPUT) {
        event.preventDefault();
      }

      const [parent] = editor.api.parent(selection) || [];
      if (!parent) return;
      if (parent.type === ELEMENT_CHANNEL_INPUT) {
        event.preventDefault();
      }
    },
  },
});

/** Enables support for autocompleting @channels. */
export const TableFlipPlugin = createPlatePlugin({
  key: ELEMENT_CHANNEL,

  // extendEditor: withTriggerCombobox as any,
  node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },
  options: {
    createComboboxInput: () => ({
      children: [{ text: '' }],
      trigger: '~',
      type: TableFlipInputPlugin.key,
    }),
    trigger: '~',
    triggerPreviousCharPattern: /^\s?$/,
  },
  plugins: [TableFlipInputPlugin],
  render: {
    node: RTETableFlipDropdownElement,
  },
})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .overrideEditor(withTriggerCombobox as any);
