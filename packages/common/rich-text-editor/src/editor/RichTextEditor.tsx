import {
  TElement,
  TDescendant,
  getStartPoint,
  resetEditor,
  isSelectionAtBlockStart,
  isBlockAboveEmpty,
  SlatePlugin,
} from '@udecode/plate-common';
import { ParagraphPlugin, PlateElement } from '@udecode/plate-common/react';
import { withProps } from '@udecode/cn';
import {
  isCodeBlockEmpty,
  isSelectionAtCodeBlockStart,
  unwrapCodeBlock,
} from '@udecode/plate-code-block';

import { LinkPlugin } from '@udecode/plate-link/react';
import { HeadingPlugin } from '@udecode/plate-heading/react';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { CodeBlockPlugin, CodeLinePlugin } from '@udecode/plate-code-block/react';
import { MentionInputPlugin, MentionPlugin } from '@udecode/plate-mention/react';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from '@udecode/plate-basic-marks/react';
import { KbdPlugin } from '@udecode/plate-kbd/react';
import { AutoformatPlugin } from '@udecode/plate-autoformat/react';
import { EmojiInputPlugin, EmojiPlugin } from '@udecode/plate-emoji/react';
import { ExitBreakPlugin, SoftBreakPlugin } from '@udecode/plate-break/react';
import { NodeIdPlugin } from '@udecode/plate-node-id';
import { ResetNodePlugin } from '@udecode/plate-reset-node/react';
import {
  BulletedListPlugin,
  ListItemPlugin,
  ListPlugin,
  NumberedListPlugin,
} from '@udecode/plate-list/react';
import { SelectOnBackspacePlugin } from '@udecode/plate-select';
import { TabbablePlugin } from '@udecode/plate-tabbable/react';
import { TrailingBlockPlugin } from '@udecode/plate-trailing-block';
import { HEADING_KEYS } from '@udecode/plate-heading';

import { BlockquoteElement } from '../components/plate-ui/blockquote-element';
import { CodeBlockElement } from '../components/plate-ui/code-block-element';
import { CodeLineElement } from '../components/plate-ui/code-line-element';
import { LinkElement } from '../components/plate-ui/link-element';
import { LinkFloatingToolbar } from '../components/plate-ui/link-floating-toolbar';
import { HeadingElement } from '../components/plate-ui/heading-element';
import { ParagraphElement } from '../components/plate-ui/paragraph-element';
import { CodeLeaf } from '../components/plate-ui/code-leaf';
import { KbdLeaf } from '../components/plate-ui/kbd-leaf';
import { FixedToolbar } from '../components/plate-ui/fixed-toolbar';
import { FixedToolbarButtons } from '../components/plate-ui/fixed-toolbar-buttons';

import { RichText } from '@homebase-id/js-lib/core';
import { useDarkMode } from '@homebase-id/common-app';

import { MediaOptions } from './ImagePlugin/ImagePlugin';
import {
  useState,
  useEffect,
  memo,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  FunctionComponent,
} from 'react';
import { autoformatRules } from '../lib/autoFormatRules';
import { EmojiInputElement } from './Combobox/EmojiCombobox';
import { MentionElement } from '../components/plate-ui/mention-element';
import { Mentionable, MentionInputElement } from '../components/plate-ui/mention-input-element';
import { ImagePlugin } from './ImagePlugin/createImagePlugin';
import { createPlateEditor, Plate, PlateContent, PlatePlugin } from '@udecode/plate-core/react';
import { focusEditor, PlateLeaf } from '@udecode/plate-common/react';
import { ListElement } from '../components/plate-ui/list-element';
import { MediaOptionsContextProvider } from './MediaOptionsContext/MediaOptionsContext';
import { useMediaOptionsContext } from './MediaOptionsContext/useMediaOptionsContext';
import { TextualEmojiPlugin } from './TextualEmojiPlugin/TextualEmojiPlugin';

interface RTEProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any[] | string | undefined;
  placeholder?: string;
  mediaOptions?: MediaOptions;
  mentionables?: Mentionable[];
  name?: string;
  onChange: (e: { target: { name: string; value: RichText } }) => void;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  uniqueId?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  disableHeadings?: boolean;
  children?: React.ReactNode;
  stickyToolbar?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins?: (PlatePlugin | PlatePlugin<any> | SlatePlugin)[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: Record<string, FunctionComponent<any>>;

  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const resetBlockTypesCommonRule = {
  types: [BlockquotePlugin.key],
  defaultType: ParagraphPlugin.key,
};

const resetBlockTypesCodeBlockRule = {
  types: [CodeBlockPlugin.key],
  defaultType: ParagraphPlugin.key,
  onReset: unwrapCodeBlock,
};

const InnerRichTextEditor = memo(
  forwardRef((props: RTEProps, ref) => {
    const {
      defaultValue,
      placeholder,
      mediaOptions,
      mentionables,
      name = 'richText',
      onChange,
      onSubmit,
      className,
      contentClassName,
      disabled,
      uniqueId,
      autoFocus,
      disableHeadings,
      stickyToolbar,
      plugins: _plugins,
      components: _components,
      onKeyDown,
    } = props;

    const { setMediaOptions } = useMediaOptionsContext();
    useEffect(() => {
      if (mediaOptions) setMediaOptions(mediaOptions);
    }, [mediaOptions]);

    const { isDarkMode } = useDarkMode();

    const defaultValAsRichText: TElement[] | undefined = useMemo(
      () =>
        defaultValue && Array.isArray(defaultValue)
          ? (defaultValue as TElement[])
          : defaultValue && typeof defaultValue === 'string'
            ? ([
                {
                  type: 'paragraph',
                  children: [{ text: defaultValue ?? '' }] as TDescendant[],
                },
              ] as TElement[])
            : undefined,
      [defaultValue]
    );

    const plugins = useMemo(
      () => ({
        plugins: [
          // Reset needs to get configured before anything else.. :shrug:
          // https://github.com/udecode/plate/issues/2736
          ResetNodePlugin.configure({
            options: {
              rules: [
                // Usage: https://platejs.org/docs/reset-node
                {
                  ...resetBlockTypesCommonRule,
                  hotkey: 'Enter',
                  predicate: isBlockAboveEmpty,
                },
                {
                  ...resetBlockTypesCommonRule,
                  hotkey: 'Backspace',
                  predicate: isSelectionAtBlockStart,
                },
                {
                  ...resetBlockTypesCodeBlockRule,
                  hotkey: 'Enter',
                  predicate: isCodeBlockEmpty,
                  // query: {
                  //   start: true,
                  //   end: true,
                  //   allow: KEYS_HEADING,
                  // },
                  // Type of query is not defined in the type, so we need to cast it to any
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
                {
                  ...resetBlockTypesCodeBlockRule,
                  hotkey: 'Backspace',
                  predicate: isSelectionAtCodeBlockStart,
                },
              ],
            },
          }),
          ParagraphPlugin,
          HeadingPlugin,
          BlockquotePlugin,
          CodeBlockPlugin.extend({
            parsers: {
              html: {
                deserializer: {
                  parse: ({ element }) => {
                    element.innerHTML = element.innerHTML.replace(/<br>/g, '\n');

                    const textContent = element.textContent || '';
                    const lines = textContent.split('\n');

                    return {
                      type: CodeBlockPlugin.key,
                      children: lines.map((line) => ({
                        type: CodeLinePlugin.key,
                        children: [{ text: line }],
                      })),
                    };
                  },
                  rules: [
                    ...(CodeBlockPlugin.parsers?.html?.deserializer?.rules || []),
                    { validAttribute: 'data-language' },
                  ],
                },
              },
            },
          }),
          LinkPlugin.configure({
            render: { afterEditable: () => <LinkFloatingToolbar /> },
          }),
          ListPlugin,
          BulletedListPlugin,
          NumberedListPlugin,
          BoldPlugin,
          ItalicPlugin,
          UnderlinePlugin,
          StrikethroughPlugin,
          CodePlugin,
          KbdPlugin,
          AutoformatPlugin.configure({
            options: {
              enableUndoOnDelete: true,
              // Usage: https://platejs.org/docs/autoformat
              rules: autoformatRules,
            },
          }),
          ExitBreakPlugin.configure({
            options: {
              rules: [
                {
                  hotkey: 'mod+enter',
                },
                {
                  hotkey: 'mod+shift+enter',
                  before: true,
                },
              ],
            },
          }),
          EmojiInputPlugin,
          NodeIdPlugin,
          SelectOnBackspacePlugin.configure({
            options: {
              query: {
                allow: [ImagePlugin.key],
              },
            },
          }),
          onSubmit
            ? undefined
            : SoftBreakPlugin.configure({
                options: {
                  rules: [
                    {
                      hotkey: 'shift+enter',
                      query: {
                        // Only in specific elements so we can combine shift+enter for regular breaks when there's a onSubmit
                        // allow: [ELEMENT_PARAGRAPH, ELEMENT_BLOCKQUOTE, ELEMENT_CODE_BLOCK],
                        allow: [],
                      },
                    },
                  ],
                },
              }),
          TabbablePlugin,
          TrailingBlockPlugin.configure({
            options: { level: 0, type: 'p' },
          }),
          EmojiPlugin,
          TextualEmojiPlugin,
          mentionables
            ? // MentionPlugin is not typed correctly to our custom implementation, so we need to cast it to any
              MentionPlugin.configure({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                options: { mentionables: mentionables || [], insertSpaceAfterMention: true } as any,
              })
            : undefined,
          mediaOptions ? ImagePlugin : undefined,
          ...(_plugins || []),
        ].filter(Boolean) as PlatePlugin[],
        override: {
          components: {
            [BlockquotePlugin.key]: BlockquoteElement,
            [CodeBlockPlugin.key]: CodeBlockElement,
            [CodeLinePlugin.key]: CodeLineElement,
            [LinkPlugin.key]: LinkElement,
            ...(disableHeadings
              ? {}
              : {
                  [HEADING_KEYS.h1]: withProps(HeadingElement, { variant: 'h1' }),
                  [HEADING_KEYS.h2]: withProps(HeadingElement, { variant: 'h2' }),
                }),
            [BulletedListPlugin.key]: withProps(ListElement, { variant: 'ul' }),
            [NumberedListPlugin.key]: withProps(ListElement, { variant: 'ol' }),
            [ListItemPlugin.key]: withProps(PlateElement, { as: 'li' }),

            [ParagraphPlugin.key]: ParagraphElement,
            [BoldPlugin.key]: withProps(PlateLeaf, { as: 'strong' }),
            [CodePlugin.key]: CodeLeaf,
            [ItalicPlugin.key]: withProps(PlateLeaf, { as: 'em' }),
            [KbdPlugin.key]: KbdLeaf,
            [StrikethroughPlugin.key]: withProps(PlateLeaf, { as: 's' }),
            [UnderlinePlugin.key]: withProps(PlateLeaf, { as: 'u' }),
            [EmojiInputPlugin.key]: EmojiInputElement,
            [MentionInputPlugin.key]: MentionInputElement,
            [MentionPlugin.key]: MentionElement,
            ...(_components || {}),
          },
        },
      }),
      [mentionables]
    );

    const editor = useMemo(() => {
      return createPlateEditor({
        id: uniqueId || 'editor',
        value: defaultValAsRichText,
        ...plugins,
      });
    }, [plugins]);

    const handleChange = useCallback(
      (newValue: TElement[]) => {
        const isActualChange = editor?.operations.some(
          (op: { type: string }) => 'set_selection' !== op.type
        );

        if (isActualChange) onChange({ target: { name: name, value: newValue } });
      },
      [editor, onChange]
    );

    useEffect(() => {
      if (autoFocus && editor) setTimeout(() => focusEditor(editor, getStartPoint(editor, [0])), 0);
    }, [autoFocus, editor]);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          if (editor) focusEditor(editor, getStartPoint(editor, [0]));
        },
        clear() {
          if (editor) resetEditor(editor);
        },
      }),
      [editor]
    );

    return (
      <>
        {/* Very dirty way of overruling default styling that are applied to the RTE */}
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-slate-editor="true"]:focus-visible {
      outline: none;
    }[data-slate-editor="true"]{
      flex-grow: 1;
    }.slate-ToolbarButton-active{
      color: rgb(0, 102, 204);
    }[class^="styles__FloatingIconWrapper"]{color: inherit;}[data-slate-placeholder="true"]{width: auto !important;}
    .slate-SelectionArea{flex-grow:1;display:flex;}
    ${isDarkMode ? '[class^="PlateFloatingLink___"]{background-color:rgba(51, 65, 85, 1);}' : ''}`,
          }}
        />
        <section
          className={`relative flex w-[100%] flex-col ${className ?? ''} [&_.slate-selected]:!bg-primary/20 [&_.slate-selection-area]:border [&_.slate-selection-area]:bg-primary/10`}
          onSubmit={(e) => e.stopPropagation()}
          onClick={disabled ? undefined : (e) => e.stopPropagation()}
        >
          <Plate
            editor={editor}
            onChange={(editor) => handleChange(editor.value)}
            readOnly={disabled}
            // Switch keys to reset the editor when going to enabled
            key={disabled ? 'disabled' : undefined}
          >
            <FixedToolbar className={stickyToolbar ? 'md:sticky' : ''}>
              <FixedToolbarButtons disableTurnInto={disableHeadings} mediaOptions={mediaOptions} />
            </FixedToolbar>

            <PlateContent
              className={contentClassName}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (onSubmit) {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      onSubmit();
                    } else {
                      e.preventDefault();
                      editor?.insertBreak();
                    }
                  }
                }

                onKeyDown?.(e);
              }}
            />
          </Plate>
          {props.children}
        </section>
      </>
    );
  })
);
InnerRichTextEditor.displayName = 'InnerRichTextEditor';

const RichTextEditor = memo(
  forwardRef(({ defaultValue, onChange, ...props }: RTEProps, ref) => {
    const [activeDefaultValue, setActiveDefaultValue] = useState(defaultValue);
    useEffect(() => {
      if (!activeDefaultValue) {
        setActiveDefaultValue(defaultValue);
      }
    }, [defaultValue]);

    const handleChange = useCallback(
      (e: {
        target: {
          name: string;
          value: RichText;
        };
      }) => onChange(e),
      [onChange]
    );

    return (
      <MediaOptionsContextProvider>
        <InnerRichTextEditor
          ref={ref}
          {...props}
          defaultValue={activeDefaultValue}
          onChange={handleChange}
        />
      </MediaOptionsContextProvider>
    );
  })
);

RichTextEditor.displayName = 'RichTextEditor';
export { RichTextEditor };
