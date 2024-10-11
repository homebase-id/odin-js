import {
  getBlockAbove,
  getEditorPlugin,
  insertText,
  isEndPoint,
  moveSelection,
} from '@udecode/plate-common';
import { TChannel, MentionOnSelectItem } from './RTEChannelDropdownPlugin';

export const getChannelOnSelectItem =
  <TItem extends TChannel = TChannel>({
    key = 'channel',
  }: { key?: string } = {}): MentionOnSelectItem<TItem> =>
  (editor, item, search = '') => {
    const { getOptions, tf } = getEditorPlugin(editor, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      key: key as any,
    });
    const { insertSpaceAfterMention } = getOptions();

    tf.insert.mention({ search, value: item.text });

    // move the selection after the element
    moveSelection(editor, { unit: 'offset' });

    const pathAbove = getBlockAbove(editor)?.[1];

    const isBlockEnd =
      editor.selection && pathAbove && isEndPoint(editor, editor.selection.anchor, pathAbove);

    if (isBlockEnd && insertSpaceAfterMention) {
      insertText(editor, ' ');
    }
  };
