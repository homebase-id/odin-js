import { TriggerComboboxPluginOptions } from '@udecode/plate-combobox';
import { createTSlatePlugin, type TElement, type TNodeProps } from '@udecode/plate-common';
import { withTriggerCombobox } from '@udecode/plate-combobox';
import { PlateEditor } from '@udecode/plate-core/react';

export const ELEMENT_CHANNEL = 'channel';
export const ELEMENT_CHANNEL_INPUT = 'channel_input';

export interface TChannelElement extends TElement {
  value: string;
  uniqueId: string;
}

export interface TChannel {
  text: string;
  key: string;
  uniqueId: string;
}

export type MentionOnSelectItem<TItem extends TChannel = TChannel> = (
  editor: PlateEditor,
  item: TItem,
  search?: string
) => void;

export interface ChannelPlugin<TItem extends TChannel = TChannel>
  extends TriggerComboboxPluginOptions {
  createChannelNode?: (item: TItem, search: string) => TNodeProps<TChannelElement>;
  insertSpaceAfterMention?: boolean;
}

/** Enables support for autocompleting #channels. */
export const ChannelPlugin = createTSlatePlugin({
  key: ELEMENT_CHANNEL,
  extendEditor: withTriggerCombobox,
  node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },

  options: {
    createComboboxInput: (trigger: string) => ({
      children: [{ text: '' }],
      trigger,
      type: ELEMENT_CHANNEL_INPUT,
    }),
    createChannelNode: (item: TChannel) => ({ value: item.text, uniqueId: item.uniqueId }),
    trigger: '#',
    triggerPreviousCharPattern: /^\s?$/,
  },

  plugins: [
    {
      isElement: true,
      isInline: true,
      isVoid: true,
      key: ELEMENT_CHANNEL_INPUT,
    },
  ],
});
