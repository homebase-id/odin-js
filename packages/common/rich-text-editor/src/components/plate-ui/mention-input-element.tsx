import { useState } from 'react';

import { cn, withRef } from '@udecode/cn';
import {
  BaseMentionPlugin,
  MentionConfig,
  MentionOnSelectItem,
  TMentionItemBase,
} from '@udecode/plate-mention';

export interface Mentionable extends TMentionItemBase {
  key: string; // unique key
  text: string; // text to insert and used as search value
  value?: string; // (optional) value to insert
  label?: string; // (optional) label to display
}

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox';
import { PlateElement } from './plate-element';
import { MentionPlugin } from '@udecode/plate-mention/react';
import {
  moveSelection,
  getBlockAbove,
  isEndPoint,
  insertText,
  getEditorPlugin,
  AnyPluginConfig,
} from '@udecode/plate-common';

const onSelectItem: MentionOnSelectItem<Mentionable> = (editor, item, search = '') => {
  const { getOptions, tf } = getEditorPlugin<MentionConfig>(editor, {
    key: BaseMentionPlugin.key,
  });
  const { insertSpaceAfterMention } = getOptions();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tf.insert.mention({ key: item.value || item.key, search, value: item.value || item.text } as any);

  // move the selection after the element
  moveSelection(editor, { unit: 'offset' });

  const pathAbove = getBlockAbove(editor)?.[1];

  const isBlockEnd =
    editor.selection && pathAbove && isEndPoint(editor, editor.selection.anchor, pathAbove);

  if (isBlockEnd && insertSpaceAfterMention) {
    insertText(editor, ' ');
  }
};

interface MentionOptions extends AnyPluginConfig {
  mentionables?: Mentionable[];
}

export const MentionInputElement = withRef<typeof PlateElement>(({ className, ...props }, ref) => {
  const { children, editor, element } = props;
  const [search, setSearch] = useState('');

  const options: MentionOptions = editor.getOptions<MentionOptions>({ key: MentionPlugin.key });
  const mentionables = options?.mentionables;

  if (!mentionables) return null;

  return (
    <PlateElement as="span" data-slate-value={element.value} ref={ref} {...props}>
      <InlineCombobox
        element={element}
        setValue={setSearch}
        showTrigger={true}
        trigger="@"
        value={search}
        hideWhenSpace={true}
      >
        <span
          className={cn(
            'ring-ring inline-block rounded-md bg-slate-100 px-1.5 py-0.5 align-baseline text-sm text-foreground focus-within:ring-2 dark:bg-slate-700',
            className
          )}
        >
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className="my-1.5">
          <InlineComboboxEmpty>No results found</InlineComboboxEmpty>

          {mentionables.map((item) => (
            <InlineComboboxItem
              key={item.value || item.key}
              onClick={() => onSelectItem(editor, item, search)}
              value={item.label || item.text}
            >
              {item.label || item.text}
            </InlineComboboxItem>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {children}
    </PlateElement>
  );
});
