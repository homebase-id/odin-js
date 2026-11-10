import { forwardRef, useMemo } from 'react';
import type { SuggestionProps } from '@tiptap/suggestion';
import { AtSign } from 'lucide-react';
import { SuggestionMenu } from './SuggestionMenu';
import type { SuggestionListRef } from './suggestionPopup';
import type { SlashItem } from './slashItems';

export type MentionItem = { id: string; label: string };

export const SlashList = forwardRef<SuggestionListRef, SuggestionProps<SlashItem>>(
  ({ items, command }, ref) => {
    const rows = useMemo(
      () =>
        items.map((item) => ({
          key: item.title,
          title: item.title,
          description: item.description,
          icon: item.icon,
        })),
      [items]
    );
    return (
      <SuggestionMenu
        ref={ref}
        rows={rows}
        label="Blocks"
        empty="No blocks found"
        onSelect={(index) => items[index] && command(items[index])}
      />
    );
  }
);
SlashList.displayName = 'SlashList';

export const MentionList = forwardRef<SuggestionListRef, SuggestionProps<MentionItem>>(
  ({ items, command }, ref) => {
    const rows = useMemo(
      () =>
        items.map((item) => ({
          key: item.id,
          title: item.label,
          description: item.label !== item.id ? item.id : undefined,
          icon: AtSign,
        })),
      [items]
    );
    return (
      <SuggestionMenu
        ref={ref}
        rows={rows}
        label="Mentions"
        empty="Nobody to mention"
        onSelect={(index) => items[index] && command(items[index])}
      />
    );
  }
);
MentionList.displayName = 'MentionList';
