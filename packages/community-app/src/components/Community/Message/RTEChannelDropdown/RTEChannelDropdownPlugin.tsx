import type { TriggerComboboxPlugin } from '@udecode/plate-combobox';
import type { TElement, TNodeProps } from '@udecode/plate-common';
import { withTriggerCombobox } from '@udecode/plate-combobox';
import {
  createPluginFactory,
  type PlateEditor,
  type PlatePluginKey,
  type Value,
  getBlockAbove,
  getPlugin,
  insertNodes,
  insertText,
  isEndPoint,
  moveSelection,
} from '@udecode/plate-common/server';

export const ELEMENT_CHANNEL = 'channel';
export const ELEMENT_CHANNEL_INPUT = 'channel_input';

export interface TChannelElement extends TElement {
  value: string;
}

export interface TChannel {
  text: string;
  key: string;
}

export type MentionOnSelectItem<TItem extends TChannel = TChannel> = <V extends Value>(
  editor: PlateEditor<V>,
  item: TItem,
  search?: string
) => void;

export const getChannelOnSelectItem =
  <TItem extends TChannel = TChannel>({
    key = ELEMENT_CHANNEL,
  }: PlatePluginKey = {}): MentionOnSelectItem<TItem> =>
  (editor, item, search = '') => {
    const {
      options: { createChannelNode, insertSpaceAfterMention },
      type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = getPlugin<ChannelPlugin>(editor as any, key);

    const props = createChannelNode!(item, search);

    insertNodes<TChannelElement>(editor, {
      children: [{ text: '' }],
      type,
      ...props,
    } as TChannelElement);

    // move the selection after the element
    moveSelection(editor, { unit: 'offset' });

    const pathAbove = getBlockAbove(editor)?.[1];

    const isBlockEnd =
      editor.selection && pathAbove && isEndPoint(editor, editor.selection.anchor, pathAbove);

    if (isBlockEnd && insertSpaceAfterMention) {
      insertText(editor, ' ');
    }
  };

export interface ChannelPlugin<TItem extends TChannel = TChannel> extends TriggerComboboxPlugin {
  createChannelNode?: (item: TItem, search: string) => TNodeProps<TChannelElement>;
  insertSpaceAfterMention?: boolean;
}

/** Enables support for autocompleting #channels. */
export const createChannelPlugin = createPluginFactory<ChannelPlugin>({
  isElement: true,
  isInline: true,
  isMarkableVoid: true,
  isVoid: true,
  key: ELEMENT_CHANNEL,
  options: {
    createComboboxInput: (trigger: string) => ({
      children: [{ text: '' }],
      trigger,
      type: ELEMENT_CHANNEL_INPUT,
    }),
    createChannelNode: (item: TChannel) => ({ value: item.text }),
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
  withOverrides: withTriggerCombobox,
});
