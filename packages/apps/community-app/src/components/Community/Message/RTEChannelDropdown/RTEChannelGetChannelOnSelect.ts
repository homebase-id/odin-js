import {
  getBlockAbove,
  getEditorPlugin,
  insertText,
  isEndPoint,
  moveSelection,
} from '@udecode/plate-common';
import { TChannel, ChannelOnSelectItem } from './RTEChannelDropdownPlugin';

export const getChannelOnSelectItem =
  <TItem extends TChannel = TChannel>({
    key = 'channel',
  }: { key?: string } = {}): ChannelOnSelectItem<TItem> =>
  (editor, item, search = '') => {
    const { getOptions, tf } = getEditorPlugin(editor, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      key: key as any,
    });
    const { insertSpaceAfterChannel } = getOptions();

    tf.insert.channel({ search, value: item.text });

    // move the selection after the element
    moveSelection(editor, { unit: 'offset' });

    const pathAbove = getBlockAbove(editor)?.[1];

    const isBlockEnd =
      editor.selection && pathAbove && isEndPoint(editor, editor.selection.anchor, pathAbove);

    if (isBlockEnd && insertSpaceAfterChannel) {
      insertText(editor, ' ');
    }
  };
