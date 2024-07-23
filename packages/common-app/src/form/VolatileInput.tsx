import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { getRichTextFromString, useDebounce } from '../..';
import { EmojiDropdown } from './VolatileInput/EmojiDropdown';
import { MentionDropdown } from './VolatileInput/MentionDropdown';
import {
  SelectionData,
  getAbsoluteOffsetToParent,
  getRelativeOffset,
  restoreSelection,
  saveSelection,
} from '../helpers/selection';

export interface VolatileInputRef {
  focus: () => void;
  clear: () => void;
}

const VolatileInput = forwardRef(
  (
    {
      onSubmit,
      onPaste,
      defaultValue,
      placeholder,
      onChange,
      linksArePlain,
      className,
      autoFocus,
    }: {
      onSubmit?: (val: string) => void;
      onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
      defaultValue?: string;
      placeholder?: string;
      onChange?: (val: string) => void;
      linksArePlain?: boolean;
      className?: string;
      autoFocus?: boolean;
    },
    ref
  ) => {
    const [wordTillCaret, setWordTillCaret] = useState<string>();
    const [lastInsertedContent, setLastInsertedContent] = useState<string>();

    const divRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(
      ref,
      () => ({
        focus() {
          divRef.current?.focus();
        },
        clear() {
          if (divRef.current) {
            divRef.current.innerText = '';
            divRef.current.innerHTML = '';
          }
        },
      }),
      []
    );

    // Custom on paste handler, to only take plain text, as the input is a span, anything is allowed by default by the browser...
    const onPasteHandler: React.ClipboardEventHandler<HTMLDivElement> = (event) => {
      if (onPaste && typeof onPaste === 'function') {
        onPaste(event);
        if (event.isDefaultPrevented()) return;
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

    const saveCaretPosition = () => {
      if (!divRef.current) return { activeSelection: undefined, absoluteOffset: undefined };
      const activeSelection = saveSelection();
      const absoluteOffset = activeSelection
        ? getAbsoluteOffsetToParent(activeSelection?.[2], activeSelection[3], divRef.current)
        : undefined;

      return { activeSelection, absoluteOffset };
    };

    const restoreCaretPosition = (
      {
        activeSelection,
        absoluteOffset,
      }: {
        activeSelection?: SelectionData;
        absoluteOffset?: number;
      },
      offset?: number
    ) => {
      if (!activeSelection) return;
      if (!absoluteOffset || !divRef.current) {
        restoreSelection(activeSelection);
        return;
      }

      const relativeOffset = getRelativeOffset(absoluteOffset, divRef.current);
      if (!relativeOffset) return;

      relativeOffset.offset += offset || 0;
      restoreSelection([
        relativeOffset.node,
        Math.max(0, relativeOffset.offset),
        relativeOffset.node,
        Math.max(0, relativeOffset.offset),
      ]);
    };

    const wrapLinks = () => {
      const textContents = divRef.current?.innerText;
      if (!textContents) return;

      const richTextData = getRichTextFromString(textContents);
      const innerHtml = richTextData?.map((part) =>
        part.type === 'a' ? `<span class="text-primary">${part?.text}</span>` : part.text
      );

      if (!innerHtml || !divRef.current) return;
      setTimeout(() => {
        if (!divRef.current) return;

        const caretPos = saveCaretPosition();
        divRef.current.innerHTML = innerHtml?.join('') + '<span></span>';
        restoreCaretPosition(caretPos);
      }, 100);
    };

    useEffect(() => {
      if (!divRef?.current) return;
      if (divRef.current.innerText === defaultValue) return;

      const caretPos = saveCaretPosition();

      const insertingContent = defaultValue?.startsWith(divRef.current.innerText || '')
        ? defaultValue?.slice(divRef.current.innerText?.length)
        : defaultValue;

      if (defaultValue === '') {
        divRef.current.innerHTML = '';
      }
      divRef.current.innerText = defaultValue || '';

      restoreCaretPosition(
        caretPos,
        wordTillCaret
          ? -(wordTillCaret.length - (lastInsertedContent?.length || 1))
          : insertingContent?.length
      );

      if (wordTillCaret) setWordTillCaret(undefined);
      if (lastInsertedContent) setLastInsertedContent(undefined);
    }, [defaultValue]);

    // We want values to be saved directly, while the link styling is better with a debounce
    const onInput: React.FormEventHandler<HTMLDivElement> = (e) => {
      if (onChange) onChange((e.target as HTMLElement).innerText);
      if (!linksArePlain) debouncedLinkStyle();
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      if (onSubmit && e.key === 'Enter' && !e.shiftKey && !wordTillCaret) {
        e.preventDefault();
        onSubmit(e.currentTarget.innerText);
      }
    };

    const onKeyUp: React.KeyboardEventHandler<HTMLDivElement> = () => {
      const wordTillCaret = getCurrentWordTillCaret();
      if (
        (wordTillCaret?.startsWith(':') || wordTillCaret?.startsWith('@')) &&
        wordTillCaret.length > 1
      )
        setWordTillCaret(wordTillCaret);
      else setWordTillCaret(undefined);
    };

    const getCurrentWordTillCaret = () => {
      if (!divRef.current) return;
      const caretPositition = saveSelection();
      if (!caretPositition) return;
      const textContent = caretPositition[0].textContent;
      if (!textContent) return;
      const textTillCaret = textContent.slice(0, caretPositition[1]);
      const lastPreceedingSpace = textTillCaret.lastIndexOf(' ');
      return textContent
        .slice(lastPreceedingSpace === -1 ? 0 : lastPreceedingSpace, caretPositition[1])
        .trim();
    };

    const doLinkStyle = () => wrapLinks();
    const debouncedLinkStyle = useDebounce(doLinkStyle, { timeoutMillis: 1000 });

    const selection = window.getSelection(),
      range = selection && selection.rangeCount ? selection.getRangeAt(0) : undefined,
      rect = range?.getClientRects()?.[0];

    useEffect(() => {
      if (autoFocus && divRef.current) divRef.current.focus();
    }, [autoFocus]);

    return (
      <div
        className={`block ${className?.indexOf('w-') === -1 ? 'w-full' : ''} ${className || ''}`}
      >
        <span
          role="textbox"
          contentEditable
          className="before:content block w-full cursor-text resize whitespace-pre-wrap break-words before:opacity-50 before:empty:content-[inherit] focus:outline-none after:absolute after:content-[''] after:pointer-events-none	 after:inset-0 after:rounded-md focus:after:ring-2 focus:after:ring-indigo-300"
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onPaste={onPasteHandler}
          onInput={onInput}
          ref={divRef}
          style={
            placeholder
              ? ({
                  '--tw-content': `'${placeholder.replaceAll("'", "\\'")}'`,
                } as React.CSSProperties)
              : undefined
          }
        ></span>

        <EmojiDropdown
          query={wordTillCaret}
          onInput={(emoji) => {
            if (onChange && emoji && wordTillCaret) {
              setLastInsertedContent(emoji);
              onChange(`${divRef.current?.innerText.replace(wordTillCaret, emoji) || ''}`);
            }
          }}
          position={rect}
        />
        <MentionDropdown
          query={wordTillCaret}
          onInput={(link) => {
            if (onChange && link && wordTillCaret) {
              setLastInsertedContent(link);
              onChange(`${divRef.current?.innerText.replace(wordTillCaret, link) || ''}`);
            }
          }}
          position={rect}
        />
      </div>
    );
  }
);

VolatileInput.displayName = 'VolatileInput';
export { VolatileInput };
