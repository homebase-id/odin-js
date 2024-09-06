import { useState } from 'react';

import { cn, withRef } from '@udecode/cn';
import { getPluginOptions, PlateElement } from '@udecode/plate-common';
import { ELEMENT_MENTION, getMentionOnSelectItem, TMentionItemBase } from '@udecode/plate-mention';

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

const onSelectItem = getMentionOnSelectItem();

interface MentionOptions {
  mentionables?: Mentionable[];
}

export const MentionInputElement = withRef<typeof PlateElement>(({ className, ...props }, ref) => {
  const { children, editor, element } = props;
  const [search, setSearch] = useState('');

  const options = getPluginOptions<MentionOptions | undefined>(editor, ELEMENT_MENTION);
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
        hideWhenNoValue={true}
      >
        <span
          className={cn(
            'inline-block rounded-md bg-muted px-1.5 py-0.5 align-baseline text-sm ring-ring focus-within:ring-2',
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
              value={item.text}
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
