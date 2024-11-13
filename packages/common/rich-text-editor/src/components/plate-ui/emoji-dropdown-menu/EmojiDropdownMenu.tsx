'use client';

import React from 'react';

import {
  type EmojiDropdownMenuOptions,
  useEmojiDropdownMenuState,
} from '@udecode/plate-emoji/react';
import { Smile } from 'lucide-react';

import { ToolbarButton } from '../toolbar';
import { EmojiToolbarDropdown } from './emoji-toolbar-dropdown';
import { insertEmoji } from '@udecode/plate-emoji';
import { useEditorRef, useEventPlateId } from '@udecode/plate-core/react';
import { EmojiPicker } from '@homebase-id/common-app';

type EmojiDropdownMenuProps = {
  options?: EmojiDropdownMenuOptions;
} & React.ComponentPropsWithoutRef<typeof ToolbarButton>;

export function EmojiDropdownMenu({ options, ...props }: EmojiDropdownMenuProps) {
  const { isOpen, setIsOpen } = useEmojiDropdownMenuState(options);
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
        onInput={(val) => {
          insertEmoji(editor, {
            id: val.unicode,
            keywords: val.tags,
            name: '',
            skins: [
              {
                native: val.unicode,
                unified: val.unicode,
              },
            ],
            version: 0,
          });
        }}
      />
    </EmojiToolbarDropdown>
  );
}
