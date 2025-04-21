import { t, useMostSpace, usePortal } from '@homebase-id/common-app';
import { useRef, useMemo, useState, useEffect, RefObject, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type DropdownValue = {
  label?: string;
  value: string;
};

export const RTEDropdown = <T extends DropdownValue>({
  trigger,
  items,
  onSelect,
  onCreate,
  onCancel,
  searchVal,
  options,
}: {
  trigger: string;
  items: T[];
  onSelect: (value: T) => void;
  onCancel: (clear?: boolean) => void;
  onCreate?: () => Promise<T>;
  searchVal?: string;
  options?: { hideTrigger?: boolean; manualFilter?: boolean };
}) => {
  const wrapperRef = useRef<HTMLElement>(null);

  const newItem = useMemo(() => {
    if (!searchVal || !onCreate) return null;
    return {
      label: searchVal,
      value: searchVal,
    } as T;
  }, [searchVal]);

  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const doSelect = async (channel: T) => {
    if (channel === newItem && onCreate) {
      if (!searchVal) return;

      const toSelectChannel = await onCreate();

      // run the onSelect callback
      onSelect(toSelectChannel);
    } else {
      onSelect(channel);
    }
  };

  const filteredItems = useMemo(() => {
    if (options?.manualFilter) return items;

    const lowerSearchVal = searchVal?.toLowerCase();

    return items.filter(
      (item) =>
        !lowerSearchVal ||
        item.label?.toLowerCase().includes(lowerSearchVal) ||
        item.value.toLowerCase().includes(lowerSearchVal)
    );
  }, [items, searchVal]);

  const [hadSearchVal, setHadSearchVal] = useState(false);
  useEffect(() => {
    if (searchVal && searchVal.length >= 1) {
      setHadSearchVal(true);
    } else if (searchVal === '' && hadSearchVal) {
      onCancel();
    }
  }, [searchVal]);

  const scrollIntoView = useCallback((selectedElement: HTMLElement | undefined) => {
    const container = selectedElement?.parentElement;
    if (!container) return;

    const { offsetTop, offsetHeight } = selectedElement;
    const { scrollTop, clientHeight } = container;

    if (offsetTop < scrollTop) {
      // If the item is above the visible area, scroll up just enough
      container.scrollTop = offsetTop;
    } else if (offsetTop + offsetHeight > scrollTop + clientHeight) {
      // If the item is below the visible area, scroll down just enough
      container.scrollTop = offsetTop + offsetHeight - clientHeight;
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Tab', 'Enter'].includes(e.key) && selectedItem) {
        e.preventDefault();
        e.stopPropagation();

        doSelect(selectedItem);
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();

        setSelectedItem((prev) => {
          if (!prev) return prev;
          const index = filteredItems.indexOf(prev);
          return filteredItems[index - 1] || prev;
        });
        scrollIntoView(document.querySelector('[data-selected="true"]') as HTMLElement);
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();

        setSelectedItem((prev) => {
          if (!prev) return prev;
          const index = filteredItems.indexOf(prev);
          return filteredItems[index + 1] || prev;
        });
        scrollIntoView(document.querySelector('[data-selected="true"]') as HTMLElement);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        onCancel();
      }

      if (e.key === 'Backspace' && searchVal === '') {
        e.preventDefault();
        e.stopPropagation();

        onCancel(true);
      }

      if (e.key === trigger) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem, onCancel, searchVal, scrollIntoView]);

  useEffect(() => {
    if (
      filteredItems.length > 0 &&
      (!selectedItem || (selectedItem && !filteredItems.includes(selectedItem)))
    ) {
      setSelectedItem(filteredItems[0]);
    } else if (filteredItems.length === 0 && searchVal) {
      setSelectedItem(newItem);
    }
  }, [filteredItems, newItem, searchVal]);

  useEffect(() => {
    if (searchVal?.includes(' ')) onCancel();
  }, [searchVal]);

  // Cancel if the wrapper is removed from the DOM; On mobile, the wrapper is removed when the `:before` is removed
  if (wrapperRef.current && !document.body.contains(wrapperRef.current)) {
    onCancel();
    return null;
  }
  if (searchVal === undefined) return null;

  return (
    <>
      <span
        ref={wrapperRef}
        data-before={trigger}
        className="min-h-[1lh] before:content-[attr(data-before)]"
      ></span>
      <FixedPortalWrapper
        wrapperRef={wrapperRef}
        className="z-10 flex max-h-44 flex-col overflow-auto rounded-lg border bg-background text-foreground shadow-lg"
      >
        {filteredItems.length === 0 && newItem ? (
          <a
            className={`block cursor-pointer px-2 py-1 transition-colors ${selectedItem === newItem ? 'bg-primary text-primary-contrast' : 'hover:bg-primary hover:text-primary-contrast'}`}
            onClick={() => doSelect(newItem)}
          >
            {t('Create "{0}"', searchVal)}
          </a>
        ) : (
          filteredItems?.map((item, index) => {
            const isSelected = selectedItem === item;

            return (
              <a
                key={item.value || index}
                onClick={() => doSelect(item)}
                className={`cursor-pointer px-2 py-1 transition-colors ${isSelected ? 'bg-primary text-primary-contrast' : 'hover:bg-primary hover:text-primary-contrast'}`}
                data-selected={isSelected}
              >
                {!options?.hideTrigger ? trigger : null}
                {item.label}
              </a>
            );
          })
        )}
      </FixedPortalWrapper>
    </>
  );
};

const FixedPortalWrapper = ({
  wrapperRef,
  children,
  className,
}: {
  wrapperRef: RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
}) => {
  const target = usePortal('dropdown-root');
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  if (!wrapperRef.current || !document.body.contains(wrapperRef.current)) return null;

  return createPortal(
    <div
      className={className}
      style={{
        position: 'fixed',
        ...(verticalSpace === 'top'
          ? {
              bottom: `calc(${window.innerHeight - (wrapperRef.current?.getBoundingClientRect().bottom || 0)}px + 1lh)`,
            }
          : { top: `calc(${wrapperRef.current?.getBoundingClientRect().top || 0}px + 1lh)` }),

        ...(horizontalSpace === 'right'
          ? {
              left: wrapperRef.current?.getBoundingClientRect().left || 0,
            }
          : {
              right: window.innerWidth - (wrapperRef.current?.getBoundingClientRect().right || 0),
            }),
      }}
    >
      {children}
    </div>,
    target
  );
};
