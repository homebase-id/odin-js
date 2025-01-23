import React, {
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { PointRef, TElement } from '@udecode/plate';

import {
  type ComboboxItemProps,
  Combobox,
  ComboboxItem,
  ComboboxPopover,
  ComboboxProvider,
  Portal,
  useComboboxContext,
  useComboboxStore,
} from '@ariakit/react';
import { cn } from '@udecode/cn';
import { useComposedRef, useEditorRef } from '@udecode/plate/react';
import { filterWords } from '@udecode/plate-combobox';
import {
  type UseComboboxInputResult,
  useComboboxInput,
  useHTMLInputCursorState,
} from '@udecode/plate-combobox/react';
import { cva } from 'class-variance-authority';
import { isTouchDevice } from '@homebase-id/js-lib/helpers';

type FilterFn = (
  item: { value: string; group?: string; keywords?: string[]; label?: string },
  search: string
) => boolean;

interface InlineComboboxContextValue {
  filter: FilterFn | false;
  inputProps: UseComboboxInputResult['props'];
  inputRef: RefObject<HTMLInputElement | null>;
  removeInput: UseComboboxInputResult['removeInput'];
  setHasEmpty: (hasEmpty: boolean) => void;
  showTrigger: boolean;
  trigger: string;
}

const InlineComboboxContext = createContext<InlineComboboxContextValue>(null as any);

export const defaultFilter: FilterFn = ({ group, keywords = [], label, value }, search) => {
  const uniqueTerms = new Set([value, ...keywords, group, label].filter(Boolean));

  return Array.from(uniqueTerms).some((keyword) => filterWords(keyword!, search));
};

interface InlineComboboxProps {
  children: ReactNode;
  element: TElement;
  trigger: string;
  filter?: FilterFn | false;
  hideWhenNoValue?: boolean;
  hideWhenSpace?: boolean;

  setValue?: (value: string) => void;
  showTrigger?: boolean;
  value?: string;
}

const InlineCombobox = ({
  children,
  element,
  filter = defaultFilter,
  hideWhenNoValue = false,
  hideWhenSpace = false,
  setValue: setValueProp,
  showTrigger = true,
  trigger,
  value: valueProp,
}: InlineComboboxProps) => {
  const editor = useEditorRef();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cursorState = useHTMLInputCursorState(inputRef);

  const [valueState, setValueState] = useState('');
  const hasValueProp = valueProp !== undefined;
  const value = hasValueProp ? valueProp : valueState;

  const setValue = useCallback(
    (newValue: string) => {
      setValueProp?.(newValue);

      if (!hasValueProp) {
        setValueState(newValue);
      }
    },
    [setValueProp, hasValueProp]
  );

  /**
   * Track the point just before the input element so we know where to
   * insertText if the combobox closes due to a selection change.
   */
  const [insertPoint, setInsertPoint] = useState<PointRef | null>(null);

  useEffect(() => {
    const path = editor.api.findPath(element);

    if (!path) return;

    const point = editor.api.before(path);

    if (!point) return;

    const pointRef = editor.api.pointRef(point);
    setInsertPoint(pointRef);

    return () => {
      pointRef.unref();
    };
  }, [editor, element]);

  const isTouch = useMemo(() => isTouchDevice(), []);
  const { props: inputProps, removeInput } = useComboboxInput({
    cancelInputOnBlur: !isTouch,
    cancelInputOnEscape: true,
    cancelInputOnBackspace: true,
    cursorState,
    ref: inputRef,
    onCancelInput: (cause) => {
      if (cause !== 'backspace') {
        editor.tf.insertText(trigger + value, {
          at: insertPoint?.current ?? undefined,
        });
      }
      if (cause === 'arrowLeft' || cause === 'arrowRight') {
        editor.tf.move({
          distance: 1,
          reverse: cause === 'arrowLeft',
        });
      }
    },
  });

  const [hasEmpty, setHasEmpty] = useState(false);

  const contextValue: InlineComboboxContextValue = useMemo(
    () => ({
      filter,
      inputProps,
      inputRef,
      removeInput,
      setHasEmpty,
      showTrigger,
      trigger,
    }),
    [trigger, showTrigger, filter, inputRef, inputProps, removeInput, setHasEmpty]
  );

  const store = useComboboxStore({
    // open: ,
    setValue: (newValue) => startTransition(() => setValue(newValue)),
  });

  const items = store.useState('items');

  /**
   * If there is no active ID and the list of items changes, select the first
   * item.
   */
  useEffect(() => {
    if (!store.getState().activeId) {
      store.setActiveId(store.first());
    }
  }, [items, store]);

  useEffect(() => {
    if (hideWhenSpace && value.includes(' ')) {
      removeInput(true);
      editor.tf.insertNodes({ text: `${trigger}${value}` });
    }
  }, [value, hideWhenSpace, removeInput]);

  return (
    <span contentEditable={false}>
      <ComboboxProvider
        open={
          (items.length > 0 || hasEmpty) &&
          (!hideWhenNoValue || value.length > 0) &&
          (!hideWhenSpace || !value.includes(' '))
        }
        store={store}
      >
        <InlineComboboxContext.Provider value={contextValue}>
          {children}
        </InlineComboboxContext.Provider>
      </ComboboxProvider>
    </span>
  );
};

const InlineComboboxInput = forwardRef<HTMLInputElement, HTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, propRef) => {
    const {
      inputProps,
      inputRef: contextRef,
      showTrigger,
      trigger,
    } = useContext(InlineComboboxContext);

    const store = useComboboxContext()!;
    const value = store.useState('value');

    const ref = useComposedRef(propRef, contextRef);

    /**
     * To create an auto-resizing input, we render a visually hidden span
     * containing the input value and position the input element on top of it.
     * This works well for all cases except when input exceeds the width of the
     * container.
     */

    return (
      <>
        {showTrigger && trigger}

        <span className="relative min-h-[1lh]">
          <span className="invisible overflow-hidden text-nowrap" aria-hidden="true">
            {value || '\u200B'}
          </span>

          <Combobox
            ref={ref}
            className={cn('absolute left-0 top-0 size-full bg-transparent outline-none', className)}
            value={value}
            autoSelect
            {...inputProps}
            {...props}
          />
        </span>
      </>
    );
  }
);

InlineComboboxInput.displayName = 'InlineComboboxInput';

const InlineComboboxContent: typeof ComboboxPopover = ({ className, ...props }) => {
  // Portal prevents CSS from leaking into popover
  return (
    <Portal>
      <ComboboxPopover
        className={cn(
          'z-[500] max-h-[288px] w-[300px] overflow-y-auto rounded-md bg-white shadow-md dark:bg-slate-800',
          className
        )}
        {...props}
      />
    </Portal>
  );
};

const comboboxItemVariants = cva(
  'relative flex z-10 h-9 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
  {
    defaultVariants: {
      interactive: true,
    },
    variants: {
      interactive: {
        false: '',
        true: 'cursor-pointer transition-colors hover:bg-primary hover:text-primary-contrast data-[active-item=true]:bg-primary data-[active-item=true]:text-primary-contrast',
      },
    },
  }
);

export type InlineComboboxItemProps = {
  focusEditor?: boolean;
  group?: string;
  keywords?: string[];
  label?: string;
} & ComboboxItemProps &
  Required<Pick<ComboboxItemProps, 'value'>>;

const InlineComboboxItem = ({
  className,
  focusEditor = true,
  group,
  keywords,
  label,
  onClick,
  ...props
}: InlineComboboxItemProps) => {
  const { value } = props;

  const { filter, removeInput } = useContext(InlineComboboxContext);

  const store = useComboboxContext()!;

  // Optimization: Do not subscribe to value if filter is false
  const search = filter && store.useState('value');

  const visible = useMemo(
    () => !filter || filter({ group, keywords, label, value }, search as string),
    [filter, group, keywords, label, value, search]
  );

  if (!visible) return null;

  return (
    <ComboboxItem
      className={cn(comboboxItemVariants(), className)}
      onClick={(event) => {
        removeInput(focusEditor);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        // Insert the selected item when the user presses Enter or Tab
        if (event.key === 'Tab') {
          removeInput(true);
          onClick?.(event as never);
        }
      }}
      {...props}
    />
  );
};

const InlineComboboxEmpty = ({ children, className }: HTMLAttributes<HTMLDivElement>) => {
  const { setHasEmpty } = useContext(InlineComboboxContext);
  const store = useComboboxContext()!;
  const items = store.useState('items');

  useEffect(() => {
    setHasEmpty(true);

    return () => {
      setHasEmpty(false);
    };
  }, [setHasEmpty]);

  if (items.length > 0) return null;

  return (
    <div className={cn(comboboxItemVariants({ interactive: false }), className)}>{children}</div>
  );
};

const InlineComboboxSeleactableEmpty = ({
  className,
  onClick,

  ...props
}: Omit<InlineComboboxItemProps, 'value'>) => {
  const { setHasEmpty } = useContext(InlineComboboxContext);
  const store = useComboboxContext()!;
  const items = store.useState('items');

  useEffect(() => {
    setHasEmpty(true);

    return () => {
      setHasEmpty(false);
    };
  }, [setHasEmpty]);

  if (items.length > 0) return null;
  return (
    <div
      className={cn(comboboxItemVariants({ interactive: true }), className)}
      {...props}
      onMouseDown={(e) => {
        if (!onClick) return;
        e.preventDefault();
        onClick(e);
      }}
    />
  );

  // const { removeInput, setHasEmpty } = useContext(InlineComboboxContext);
  // const store = useComboboxContext()!;
  // const items = store.useState('items');

  // // useEffect(() => {
  // //   setHasEmpty(true);

  // //   return () => {
  // //     setHasEmpty(false);
  // //   };
  // // }, [setHasEmpty]);

  // if (items.length > 0) return null;

  // return (
  //   <ComboboxItem
  //     // className={cn(comboboxItemVariants(), className)}
  //     // onClick={(event) => {
  //     //   removeInput(true);
  //     //   onClick?.(event);
  //     // }}
  //     children={'Create new channel'}
  //     // {...props}
  //   />
  // );
};

export {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxSeleactableEmpty,
  InlineComboboxInput,
  InlineComboboxItem,
};
