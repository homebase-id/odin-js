import { useState } from 'react';

import { cn, withRef } from '@udecode/cn';
import { getMentionOnSelectItem, TMentionItemBase } from '@udecode/plate-mention';

export interface Mentionable extends TMentionItemBase {
  key: string;
}

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox';
import { AnyPluginConfig } from '@udecode/plate-core';
import { PlateElement } from './plate-element';
import { MentionPlugin } from '@udecode/plate-mention/react';

const onSelectItem = getMentionOnSelectItem();

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
        // hideWhenNoValue={true}
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
              key={item.key}
              onClick={() => onSelectItem(editor, item, search)}
              value={item.text.replaceAll('@', '')}
            >
              {item.text}
            </InlineComboboxItem>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {children}
    </PlateElement>
  );
});
