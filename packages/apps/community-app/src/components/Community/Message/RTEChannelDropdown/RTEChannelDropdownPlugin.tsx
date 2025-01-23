import { TriggerComboboxPluginOptions, withTriggerCombobox } from '@udecode/plate-combobox';
import { createPlatePlugin, PlateEditor } from '@udecode/plate-core/react';
import { RTEChannelDropdownInputElement } from './RTEChannelDropdownInputElement';
import { RTEChannelDropdownElement } from './RTEChannelDropdownElement';
import { PluginConfig } from '@udecode/plate-core';
import { Node, TElement } from '@udecode/plate';

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

export type ChannelOnSelectItem<TItem extends TChannel = TChannel> = (
  editor: PlateEditor,
  item: TItem,
  search?: string,
  element?: Node
) => void;

export type ChannelConfig = PluginConfig<
  'channel',
  {
    insertSpaceAfterChannel?: boolean;
  } & TriggerComboboxPluginOptions,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  {
    insert: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel: (options: { search: string; value: any }) => void;
    };
  }
>;

export const ChannelInputPlugin = createPlatePlugin({
  key: 'channel_input',
  node: { isElement: true, isInline: true },
  render: {
    node: RTEChannelDropdownInputElement,
  },
});

/** Enables support for autocompleting @channels. */
export const ChannelPlugin = createPlatePlugin({
  key: 'channel',

  // extendEditor: withTriggerCombobox as any,
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
})
  .extendEditorTransforms<ChannelConfig['transforms']>(({ editor, type }) => ({
    insert: {
      channel: ({ value }) => {
        editor.tf.insertNodes({
          children: [{ text: '' }],
          type,
          value,
          uniqueId: value,
        });
      },
    },
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .overrideEditor(withTriggerCombobox as any);
