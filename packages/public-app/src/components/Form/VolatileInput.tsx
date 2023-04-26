import { debounce } from 'lodash-es';
import { useEffect, useMemo, useRef } from 'react';
import { getRichTextFromString } from '../../helpers/richTextHelper';
import {
  saveSelection,
  restoreSelection,
  getAbsoluteOffsetToParent,
  getRelativeOffset,
} from '../../helpers/selection';

const VolatileInput = ({
  onSubmit,
  onPaste,
  defaultValue,
  placeholder,
  onChange,
  linksArePlain,
}: {
  onSubmit: (val: string) => void;
  onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (val: string) => void;
  linksArePlain?: boolean;
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  // Custom on paste handler, to only take plain text, as the input is a span, anything is allowed by default by the browser...
  const onPasteHandler: React.ClipboardEventHandler<HTMLDivElement> = (event) => {
    if (onPaste && typeof onPaste === 'function') {
      onPaste(event);
      if (event.isDefaultPrevented()) {
        return;
      }
    }

    event.stopPropagation();
    event.preventDefault();

    const paste = event.clipboardData.getData('text');
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(paste));
    selection.collapseToEnd();

    onChange && onChange(divRef.current?.innerText || '');
  };

  const wrapLinks = () => {
    const textContents = divRef.current?.innerText;
    if (!textContents) return;

    const richTextData = getRichTextFromString(textContents);
    const innerHtml = richTextData?.map((part) =>
      part.type === 'a' ? `<span class="text-button">${part?.url}</span>` : part.text
    );

    if (!innerHtml || !divRef.current) return;
    setTimeout(() => {
      if (!divRef.current) return;

      const activeSelection = saveSelection();
      // console.log({ activeSelection });
      const absoluteOffset = activeSelection
        ? getAbsoluteOffsetToParent(activeSelection?.[2], activeSelection[3], divRef.current)
        : undefined;
      // console.log({ absoluteOffset });

      divRef.current.innerHTML = innerHtml?.join('') + '<span></span>';

      if (!activeSelection) return;
      if (!absoluteOffset) {
        restoreSelection(activeSelection);
        return;
      }

      const relativeOffset = getRelativeOffset(absoluteOffset, divRef.current);

      if (relativeOffset) {
        restoreSelection([
          relativeOffset.node,
          relativeOffset.offset,
          relativeOffset.node,
          relativeOffset.offset,
        ]);
      }
    }, 100);
  };

  useEffect(() => {
    if (divRef?.current) {
      if (divRef.current.innerText !== defaultValue) {
        divRef.current.innerText = defaultValue || '';
      }
    }
  }, [defaultValue]);

  const onInput: React.FormEventHandler<HTMLDivElement> = (e) => {
    if (onChange) onChange((e.target as HTMLElement).innerText);
    if (!linksArePlain) wrapLinks();
  };

  const debouncedOnInput = useMemo(() => debounce(onInput, 200), [onInput]);

  return (
    <div
      role="textbox"
      contentEditable
      className="before:content block w-full cursor-pointer resize whitespace-pre-wrap break-words before:opacity-50 before:empty:content-[inherit] focus:outline-none"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSubmit(e.currentTarget.innerText);
        }
      }}
      onPaste={onPasteHandler}
      onInput={debouncedOnInput}
      ref={divRef}
      style={{ '--tw-content': `"${placeholder}"` } as React.CSSProperties}
    ></div>
  );
};

export default VolatileInput;
