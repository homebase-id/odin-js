'use client';

import { useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  comboboxActions,
  ComboboxContentItemProps,
  ComboboxContentProps,
  ComboboxProps,
  Data,
  NoData,
  TComboboxItem,
  useActiveComboboxStore,
  useComboboxContent,
  useComboboxContentState,
  useComboboxControls,
  useComboboxItem,
  useComboboxSelectors,
} from '@udecode/plate-combobox';
import { useEditorState, useEventEditorSelectors } from '@udecode/plate-common';
import { createVirtualRef } from '@udecode/plate-floating';

import { cn } from '../../lib/utils';

export function ComboboxItem<TData extends Data = NoData>({
  combobox,
  index,
  item,
  onRenderItem,
}: ComboboxContentItemProps<TData>) {
  const { props } = useComboboxItem({ item, index, combobox, onRenderItem });

  return (
    <div
      className={cn(
        'relative flex h-9 cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-primary/20 data-[highlighted=true]:bg-primary/20'
      )}
      {...props}
    />
  );
}

export function ComboboxContent<TData extends Data = NoData>(props: ComboboxContentProps<TData>) {
  const { component: Component, items, portalElement, combobox, onRenderItem } = props;

  const editor = useEditorState();

  const filteredItems = useComboboxSelectors.filteredItems() as TComboboxItem<TData>[];
  const activeComboboxStore = useActiveComboboxStore()!;

  const state = useComboboxContentState({ items, combobox });
  const { menuProps, targetRange } = useComboboxContent(state);

  return (
    <Popover.Root open>
      <Popover.PopoverAnchor virtualRef={createVirtualRef(editor, targetRange ?? undefined)} />

      <Popover.Portal container={portalElement}>
        <Popover.Content
          {...menuProps}
          sideOffset={5}
          side="bottom"
          align="start"
          className={cn(
            'z-[500] m-0 max-h-[288px] w-[300px] overflow-y-scroll rounded-md bg-background p-0 shadow-md'
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {Component ? Component({ store: activeComboboxStore }) : null}

          {filteredItems.map((item, index) => (
            <ComboboxItem
              key={item.key}
              item={item}
              combobox={combobox}
              index={index}
              onRenderItem={onRenderItem}
            />
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Register the combobox id, trigger, onSelectItem
 * Renders the combobox if active.
 */
export function Combobox<TData extends Data = NoData>({
  id,
  trigger,
  searchPattern,
  onSelectItem,
  controlled,
  maxSuggestions,
  filter,
  sort,
  disabled: _disabled,
  ...props
}: ComboboxProps<TData>) {
  const storeItems = useComboboxSelectors.items();
  const disabled = _disabled ?? (storeItems.length === 0 && !props.items?.length);

  const focusedEditorId = useEventEditorSelectors.focus?.();
  const combobox = useComboboxControls();
  const activeId = useComboboxSelectors.activeId();
  const editor = useEditorState();

  useEffect(() => {
    comboboxActions.setComboboxById({
      id,
      trigger,
      searchPattern,
      controlled,
      onSelectItem,
      maxSuggestions,
      filter,
      sort,
    });
  }, [id, trigger, searchPattern, controlled, onSelectItem, maxSuggestions, filter, sort]);

  if (
    !combobox ||
    !editor.selection ||
    focusedEditorId !== editor.id ||
    activeId !== id ||
    disabled
  ) {
    return null;
  }

  return <ComboboxContent combobox={combobox} {...props} />;
}
