import { getEditorPlugin } from '@udecode/plate';
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
    editor.tf.move({ unit: 'offset' });

    const pathAbove = editor.api.block({ above: true })?.[1];

    const isBlockEnd =
      editor.selection && pathAbove && editor.api.isEnd(editor.selection.anchor, pathAbove);

    if (isBlockEnd && insertSpaceAfterChannel) {
      editor.tf.insertText(' ');
    }
  };
