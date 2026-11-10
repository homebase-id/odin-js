import { forwardRef, useImperativeHandle, useRef, useState, type ComponentType } from 'react';
import type { SuggestionListRef } from './suggestionPopup';

export type SuggestionRow = {
  key: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
};

/** The list in a suggestion popup (slash commands, mentions), driven by the arrow keys and Enter. */
export const SuggestionMenu = forwardRef<
  SuggestionListRef,
  { rows: SuggestionRow[]; onSelect: (index: number) => void; label: string; empty?: string }
>(({ rows, onSelect, label, empty }, ref) => {
  const [selected, setSelected] = useState(0);
  // Only the arrow keys scroll the list; a hover must not move it under the pointer
  const fromKeyboard = useRef(false);
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setSelected(0);
  }

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (!rows.length) return false;
        if (event.key === 'ArrowUp') {
          fromKeyboard.current = true;
          setSelected((i) => (i + rows.length - 1) % rows.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          fromKeyboard.current = true;
          setSelected((i) => (i + 1) % rows.length);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          onSelect(selected);
          return true;
        }
        return false;
      },
    }),
    [rows, selected, onSelect]
  );

  return (
    <div
      role="listbox"
      aria-label={label}
      // Picking a row must not take focus from the editor
      onMouseDown={(e) => e.preventDefault()}
      className="max-h-80 w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-gray-200 bg-background p-1 text-foreground shadow-lg dark:border-gray-700"
    >
      {rows.length ? (
        rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <button
              key={row.key}
              type="button"
              role="option"
              aria-selected={index === selected}
              ref={(el) => {
                if (index === selected && fromKeyboard.current) {
                  el?.scrollIntoView({ block: 'nearest' });
                  fromKeyboard.current = false;
                }
              }}
              onClick={() => onSelect(index)}
              onMouseEnter={() => setSelected(index)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm ${
                index === selected ? 'bg-primary/10' : ''
              }`}
            >
              {Icon ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-background dark:border-gray-700">
                  <Icon className="h-4 w-4" />
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{row.title}</span>
                {row.description ? (
                  <span className="truncate text-xs text-foreground/60">{row.description}</span>
                ) : null}
              </span>
            </button>
          );
        })
      ) : (
        <p className="px-2 py-1 text-sm text-foreground/60">{empty}</p>
      )}
    </div>
  );
});
SuggestionMenu.displayName = 'SuggestionMenu';
