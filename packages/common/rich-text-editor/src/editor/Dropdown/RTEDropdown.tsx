import { t, useMostSpace, usePortal } from '@homebase-id/common-app';
import { useRef, useMemo, useState, useEffect, RefObject } from 'react';
import { createPortal } from 'react-dom';

export type DropdownValue = {
  label: string;
  value: string;
};

export const RTEDropdown = <T extends DropdownValue>({
  trigger,
  items,
  onSelect,
  onCreate,
  onCancel,
  searchVal,
}: {
  trigger: string;
  items: T[];
  onSelect: (value: T) => void;
  onCancel: (clear?: boolean) => void;
  onCreate?: () => Promise<T>;
  searchVal?: string;
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

  const filteredItems = useMemo(
    () =>
      items.filter(
        (chnl) =>
          !searchVal ||
          chnl.label.toLowerCase().includes(searchVal.toLowerCase()) ||
          chnl.value.toLowerCase().includes(searchVal.toLowerCase())
      ),
    [items, searchVal]
  );

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
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();

        setSelectedItem((prev) => {
          if (!prev) return prev;
          const index = filteredItems.indexOf(prev);
          return filteredItems[index + 1] || prev;
        });
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
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem, onCancel, searchVal]);

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

  if (searchVal === undefined) return null;

  return (
    <>
      <span
        ref={wrapperRef}
        data-before={trigger}
        className="before:content-[attr(data-before)]"
      ></span>
      <FixedPortalWrapper
        wrapperRef={wrapperRef}
        className="z-10 flex flex-col rounded-md border border-gray-200 bg-white shadow-lg"
      >
        {filteredItems.length === 0 && newItem ? (
          <a
            className={`cursor-pointer px-2 py-1 transition-colors ${selectedItem === newItem ? 'bg-primary text-primary-contrast' : 'hover:bg-primary hover:text-primary-contrast'}`}
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
              >
                {trigger}
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

  return createPortal(
    <div
      className={className}
      style={{
        position: 'fixed',
        ...(verticalSpace === 'top'
          ? {
              bottom: `calc(${window.innerHeight - (wrapperRef.current?.getBoundingClientRect().bottom || 0)}px + 1lh)`,
            }
          : { top: wrapperRef.current?.getBoundingClientRect().top || 0 }),

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
