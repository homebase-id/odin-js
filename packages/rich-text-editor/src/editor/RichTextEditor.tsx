import {
  createPlugins,
  Plate,
  RenderAfterEditable,
  PlateElement,
  PlateLeaf,
  PlateEditor,
  Value,
  useEditorRef,
  usePlateId,
  TElement,
  createDeserializeHtmlPlugin,
  PlateContent,
  TDescendant,
  focusEditor,
  getStartPoint,
  resetEditor,
  isSelectionAtBlockStart,
  isBlockAboveEmpty,
  PlatePlugin,
  PlatePluginComponent,
} from '@udecode/plate-common';
import { withProps } from '@udecode/cn';
import { createParagraphPlugin, ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph';
import { createHeadingPlugin, ELEMENT_H1, ELEMENT_H2, KEYS_HEADING } from '@udecode/plate-heading';
import { createBlockquotePlugin, ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote';
import {
  createCodeBlockPlugin,
  ELEMENT_CODE_BLOCK,
  ELEMENT_CODE_LINE,
  isCodeBlockEmpty,
  isSelectionAtCodeBlockStart,
  unwrapCodeBlock,
} from '@udecode/plate-code-block';
import { createLinkPlugin, ELEMENT_LINK } from '@udecode/plate-link';
import { createListPlugin, ELEMENT_UL, ELEMENT_OL, ELEMENT_LI } from '@udecode/plate-list';
import {
  createBoldPlugin,
  MARK_BOLD,
  createItalicPlugin,
  MARK_ITALIC,
  createUnderlinePlugin,
  MARK_UNDERLINE,
  createStrikethroughPlugin,
  MARK_STRIKETHROUGH,
  createCodePlugin,
  MARK_CODE,
} from '@udecode/plate-basic-marks';
import { createKbdPlugin, MARK_KBD } from '@udecode/plate-kbd';
import { createAutoformatPlugin } from '@udecode/plate-autoformat';
import { createBlockSelectionPlugin } from '@udecode/plate-selection';
import { createExitBreakPlugin, createSoftBreakPlugin } from '@udecode/plate-break';
import { createNodeIdPlugin } from '@udecode/plate-node-id';
import { createResetNodePlugin } from '@udecode/plate-reset-node';
import { createSelectOnBackspacePlugin } from '@udecode/plate-select';
import { createTabbablePlugin } from '@udecode/plate-tabbable';
import { createTrailingBlockPlugin } from '@udecode/plate-trailing-block';
import { createDeserializeMdPlugin } from '@udecode/plate-serializer-md';

import { createEmojiPlugin, ELEMENT_EMOJI_INPUT } from '@udecode/plate-emoji';
import {
  createMentionPlugin,
  ELEMENT_MENTION,
  ELEMENT_MENTION_INPUT,
} from '@udecode/plate-mention';

import { BlockquoteElement } from '../components/plate-ui/blockquote-element';
import { CodeBlockElement } from '../components/plate-ui/code-block-element';
import { CodeLineElement } from '../components/plate-ui/code-line-element';
import { LinkElement } from '../components/plate-ui/link-element';
import { LinkFloatingToolbar } from '../components/plate-ui/link-floating-toolbar';
import { HeadingElement } from '../components/plate-ui/heading-element';
import { ListElement } from '../components/plate-ui/list-element';
import { ParagraphElement } from '../components/plate-ui/paragraph-element';
import { CodeLeaf } from '../components/plate-ui/code-leaf';
import { KbdLeaf } from '../components/plate-ui/kbd-leaf';
import { FixedToolbar } from '../components/plate-ui/fixed-toolbar';
import { FixedToolbarButtons } from '../components/plate-ui/fixed-toolbar-buttons';

import { RichText } from '@homebase-id/js-lib/core';
import { useDarkMode } from '@homebase-id/common-app';

import { ELEMENT_IMAGE, MediaOptions } from './ImagePlugin/ImagePlugin';
import {
  useState,
  useEffect,
  memo,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { autoformatRules } from '../lib/autoFormatRules';
import { EmojiInputElement } from './Combobox/EmojiCombobox';
import { MentionElement } from '../components/plate-ui/mention-element';
import { Mentionable, MentionInputElement } from '../components/plate-ui/mention-input-element';
import { createImagePlugin } from './ImagePlugin/createImagePlugin';

interface RTEProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any[] | string | undefined;
  placeholder?: string;
  mediaOptions?: MediaOptions;
  mentionables?: Mentionable[];
  name?: string;
  onChange: (e: { target: { name: string; value: RichText } }) => void;
  className?: string;
  disabled?: boolean;
  uniqueId?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  disableHeadings?: boolean;
  children?: React.ReactNode;

  plugins?: PlatePlugin[];
  components?: Record<string, PlatePluginComponent> | undefined;
}

const resetBlockTypesCommonRule = {
  types: [ELEMENT_BLOCKQUOTE],
  defaultType: ELEMENT_PARAGRAPH,
};

const resetBlockTypesCodeBlockRule = {
  types: [ELEMENT_CODE_BLOCK],
  defaultType: ELEMENT_PARAGRAPH,
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
      disabled,
      uniqueId,
      autoFocus,
      disableHeadings,
      plugins: _plugins,
      components: _components,
    } = props;

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
      () =>
        createPlugins(
          [
            createParagraphPlugin(),
            createHeadingPlugin(),
            createBlockquotePlugin(),
            createCodeBlockPlugin(),
            createLinkPlugin({
              renderAfterEditable: LinkFloatingToolbar as RenderAfterEditable,
            }),
            createListPlugin(),
            createBoldPlugin(),
            createItalicPlugin(),
            createUnderlinePlugin(),
            createStrikethroughPlugin(),
            createCodePlugin(),
            createKbdPlugin(),
            createAutoformatPlugin({
              options: {
                rules: autoformatRules,
                enableUndoOnDelete: true,
              },
            }),
            createBlockSelectionPlugin({
              options: {
                sizes: {
                  top: 0,
                  bottom: 0,
                },
              },
            }),
            createExitBreakPlugin({
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
            createNodeIdPlugin(),
            createResetNodePlugin({
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
                    query: {
                      start: true,
                      end: true,
                      allow: KEYS_HEADING,
                    },
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
            createSelectOnBackspacePlugin({
              options: {
                query: {
                  allow: [ELEMENT_IMAGE],
                },
              },
            }),
            onSubmit
              ? undefined
              : createSoftBreakPlugin({
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
            createTabbablePlugin(),
            createTrailingBlockPlugin({
              options: { type: ELEMENT_PARAGRAPH },
            }),
            createDeserializeHtmlPlugin(),
            createDeserializeMdPlugin(),
            createEmojiPlugin(),
            // createMentionPlugin is not typed correctly to our custom implementation, so we need to cast it to any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createMentionPlugin({ options: { mentionables: mentionables || [] } as any }),
            mediaOptions ? createImagePlugin({ options: mediaOptions }) : undefined,
            ...(_plugins || []),
          ].filter(Boolean) as PlatePlugin[],
          {
            components: {
              [ELEMENT_BLOCKQUOTE]: BlockquoteElement,
              [ELEMENT_CODE_BLOCK]: CodeBlockElement,
              [ELEMENT_CODE_LINE]: CodeLineElement,
              [ELEMENT_LINK]: LinkElement,
              ...(disableHeadings
                ? {}
                : {
                    [ELEMENT_H1]: withProps(HeadingElement, { variant: 'h1' }),
                    [ELEMENT_H2]: withProps(HeadingElement, { variant: 'h2' }),
                  }),
              [ELEMENT_UL]: withProps(ListElement, { variant: 'ul' }),
              [ELEMENT_OL]: withProps(ListElement, { variant: 'ol' }),
              [ELEMENT_LI]: withProps(PlateElement, { as: 'li' }),
              [ELEMENT_PARAGRAPH]: ParagraphElement,
              [MARK_BOLD]: withProps(PlateLeaf, { as: 'strong' }),
              [MARK_CODE]: CodeLeaf,
              [MARK_ITALIC]: withProps(PlateLeaf, { as: 'em' }),
              [MARK_KBD]: KbdLeaf,
              [MARK_STRIKETHROUGH]: withProps(PlateLeaf, { as: 's' }),
              [MARK_UNDERLINE]: withProps(PlateLeaf, { as: 'u' }),
              [ELEMENT_EMOJI_INPUT]: EmojiInputElement,
              [ELEMENT_MENTION]: MentionElement,
              [ELEMENT_MENTION_INPUT]: MentionInputElement,
              ...(_components || {}),
            },
          }
        ),
      [mediaOptions, mentionables]
    );

    const [innerEditor, setInnerEditor] = useState<PlateEditor<Value>>();
    const EditorExposer = useCallback(() => {
      const editor = useEditorRef(usePlateId());

      useEffect(() => {
        setInnerEditor(editor);
      }, [editor]);

      return null;
    }, []);

    const handleChange = useCallback(
      (newValue: TElement[]) => {
        const isActualChange = innerEditor?.operations.some(
          (op: { type: string }) => 'set_selection' !== op.type
        );

        if (isActualChange) onChange({ target: { name: name, value: newValue } });
      },
      [innerEditor, onChange]
    );

    useEffect(() => {
      if (autoFocus && innerEditor)
        setTimeout(() => focusEditor(innerEditor, getStartPoint(innerEditor, [0])), 0);
    }, [autoFocus, innerEditor]);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          if (innerEditor) focusEditor(innerEditor, getStartPoint(innerEditor, [0]));
        },
        clear() {
          if (innerEditor) resetEditor(innerEditor);
        },
      }),
      [innerEditor]
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
    }[class^="styles__FloatingIconWrapper"]{color: inherit;}[data-slate-placeholder="true"]{width: auto !important; padding-top: 0.25rem;}
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
            id={uniqueId}
            initialValue={defaultValAsRichText}
            plugins={plugins}
            onChange={handleChange}
            readOnly={disabled}
            // Switch keys to reset the editor when going to enabled
            key={disabled ? 'disabled' : undefined}
          >
            <FixedToolbar>
              <FixedToolbarButtons disableHeadings={disableHeadings} mediaOptions={mediaOptions} />
            </FixedToolbar>

            <PlateContent
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (onSubmit) {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      onSubmit();
                    } else {
                      e.preventDefault();
                      innerEditor?.insertBreak();
                    }
                  }
                }
              }}
            />

            <EditorExposer />
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
      <InnerRichTextEditor
        ref={ref}
        {...props}
        defaultValue={activeDefaultValue}
        onChange={handleChange}
      />
    );
  })
);

RichTextEditor.displayName = 'RichTextEditor';
export { RichTextEditor };
