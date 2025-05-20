import { useEffect, useMemo, useState } from 'react';

import { withRef } from '@udecode/cn';

import { PlateElement } from '../../components/plate-ui/plate-element';

import { Database } from 'emoji-picker-element';
import { NativeEmoji } from 'emoji-picker-element/shared';
import { DropdownValue, RTEDropdown } from '../Dropdown/RTEDropdown';
import { TNode } from '@udecode/plate';
import { PlateEditor } from '@udecode/plate-core/react';
import { getPlainTextFromRichText } from '@homebase-id/common-app';
const database = new Database({
  dataSource: '/emoji/emoji-data.json',
});

const onSelectItem = (editor: PlateEditor, item: DropdownValue, node: TNode) => {
  if (node) {
    const path = editor.api.findPath(node);
    editor.tf.removeNodes({ at: path });
  }

  editor.tf.insertNodes({ text: item.value });

  // move the selection after the element
  editor.tf.move({ unit: 'offset' });
};

const onCancel = (editor: PlateEditor, value: string, node: TNode) => {
  const path = editor.api.findPath(node);
  if (!path) return;

  editor.tf.replaceNodes({ text: value }, { at: path, select: true });
};

export const EmojiDropdownInputElement = withRef<typeof PlateElement>(({ ...props }, ref) => {
  const { children, editor, element } = props;
  const value = useMemo(() => getPlainTextFromRichText(element.children), [element.children]);
  const [emojis, setEmojis] = useState<DropdownValue[]>();

  useEffect(() => {
    (async () => {
      if (!value || value.trim().length === 0) return [];
      const skintone = await database.getPreferredSkinTone();

      const filteredEmojis = ((await database.getEmojiBySearchQuery(value.replace(/:$/, ''))) ||
        []) as NativeEmoji[];

      const dropdownValues: DropdownValue[] = filteredEmojis.map((emoji) => {
        const unicode =
          (emoji.skins && skintone
            ? emoji.skins.find((skin) => skin.tone === skintone)?.unicode
            : undefined) || emoji.unicode;

        return {
          label: `${unicode} ${emoji.annotation}`,
          value: unicode,
        };
      });

      setEmojis(dropdownValues);
    })();
  }, [value]);

  return (
    <PlateElement as="span" data-slate-value={element.value} ref={ref} {...props}>
      <RTEDropdown
        trigger=":"
        items={emojis || []}
        onSelect={(channelItem) => onSelectItem(editor, channelItem, element)}
        onCancel={(clear) => onCancel(editor, clear ? '' : `${element.trigger}${value}`, element)}
        searchVal={value}
        options={{
          hideTrigger: true,
          manualFilter: true,
        }}
      />
      {children}
    </PlateElement>
  );
});
