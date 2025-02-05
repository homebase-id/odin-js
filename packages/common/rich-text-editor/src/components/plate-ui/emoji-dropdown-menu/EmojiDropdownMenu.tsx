import React from 'react';

import { Smile } from 'lucide-react';

import { ToolbarButton } from '../toolbar';
import { EmojiToolbarDropdown } from './emoji-toolbar-dropdown';
import { useEditorRef, useEventPlateId } from '@udecode/plate-core/react';
import { EmojiPicker } from '@homebase-id/common-app';

import { Database } from 'emoji-picker-element';
const database = new Database({
  dataSource: '/emoji/emoji-data.json',
});

export function EmojiDropdownMenu({ ...props }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const editor = useEditorRef(useEventPlateId());

  return (
    <EmojiToolbarDropdown
      control={
        <ToolbarButton pressed={isOpen} tooltip="Emoji" isDropdown {...props}>
          <Smile />
        </ToolbarButton>
      }
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <EmojiPicker
        onInput={async (val) => {
          const skintone = await database.getPreferredSkinTone();

          const unicode =
            (val.skins && skintone
              ? val.skins.find((skin) => skin.tone === skintone)?.unicode
              : undefined) || val.unicode;

          editor.tf.insertNodes({ text: unicode });
          editor.tf.focus();

          setIsOpen(false);
        }}
      />
    </EmojiToolbarDropdown>
  );
}
