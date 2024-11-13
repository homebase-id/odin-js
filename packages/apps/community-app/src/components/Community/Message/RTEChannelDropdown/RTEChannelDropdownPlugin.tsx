import { TriggerComboboxPluginOptions, withTriggerCombobox } from '@udecode/plate-combobox';
import { insertNodes, PluginConfig, type TElement } from '@udecode/plate-common';
import { createPlatePlugin, PlateEditor } from '@udecode/plate-core/react';
import { RTEChannelDropdownInputElement } from './RTEChannelDropdownInputElement';
import { RTEChannelDropdownElement } from './RTEChannelDropdownElement';

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

export type ChannelConfig = PluginConfig<
  'channel',
  {
    insertSpaceAfterMention?: boolean;
  } & TriggerComboboxPluginOptions,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  {
    insert: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mention: (options: { search: string; value: any }) => void;
    };
  }
>;

export const ChannelInputPlugin = createPlatePlugin({
  key: 'channel_input',
  node: { isElement: true, isInline: true, isVoid: true },
  render: {
    node: RTEChannelDropdownInputElement,
  },
});

/** Enables support for autocompleting @channels. */
export const ChannelPlugin = createPlatePlugin({
  key: 'channel',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extendEditor: withTriggerCombobox as any,
  node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },
  options: {
    createComboboxInput: () => ({
      children: [{ text: '' }],
      trigger: '#',
      type: ChannelInputPlugin.key,
    }),
    trigger: '#',
    triggerPreviousCharPattern: /^\s?$/,
  },
  plugins: [ChannelInputPlugin],
  render: {
    node: RTEChannelDropdownElement,
  },
}).extendEditorTransforms<ChannelConfig['transforms']>(({ editor, type }) => ({
  insert: {
    mention: ({ value }) => {
      insertNodes<TChannelElement>(editor, {
        children: [{ text: '' }],
        type,
        value,
        uniqueId: value,
      });
    },
  },
}));
