import { TElement, SlatePlugin, Descendant } from '@udecode/plate';
import { ParagraphPlugin, PlateElement, usePlateEditor } from '@udecode/plate/react';
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
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from '@udecode/plate-basic-marks/react';
import { KbdPlugin } from '@udecode/plate-kbd/react';
import { AutoformatPlugin } from '@udecode/plate-autoformat/react';
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
import { EmojiDropdownInputElement } from './Emoji/EmojiDropdownInputElement';
import { TextualEmojiPlugin } from './TextualEmojiPlugin/TextualEmojiPlugin';
import { EmojiInputPlugin, EmojiPlugin } from './Emoji/EmojiDropdownPlugin';
import { ImagePlugin } from './ImagePlugin/createImagePlugin';
import { Plate, PlateContent, PlatePlugin } from '@udecode/plate-core/react';
import { PlateLeaf } from '@udecode/plate/react';
import { ListElement } from '../components/plate-ui/list-element';
import { MediaOptionsContextProvider } from './MediaOptionsContext/MediaOptionsContextProvider';
import { useMediaOptionsContext } from './MediaOptionsContext/useMediaOptionsContext';
import { MentionInputPlugin, MentionPlugin } from './Mention/MentionDropdownPlugin';
import type { Mentionable } from './Mention/MentionDropdownPlugin';
import { MentionDropdownInputElement } from './Mention/MentionDropdownInputElement';
import { MentionDropdownElement } from './Mention/MentionDropdownElement';

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
                  children: [{ text: defaultValue ?? '' }] as Descendant[],
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
                  predicate: (editor) => editor.api.isEmpty(editor.selection, { block: true }),
                },
                {
                  ...resetBlockTypesCommonRule,
                  hotkey: 'Backspace',
                  predicate: (editor) => editor.api.isAt({ start: true }),
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
            [MentionInputPlugin.key]: MentionDropdownInputElement,
            [MentionPlugin.key]: MentionDropdownElement,
            [EmojiInputPlugin.key]: EmojiDropdownInputElement,
            ...(_components || {}),
          },
        },
      }),
      [mentionables]
    );

    const editor = usePlateEditor({
      id: uniqueId || 'editor',
      value: defaultValAsRichText,
      ...plugins,
    });

    // const editor = useMemo(() => {
    //   return createPlateEditor({
    //     id: uniqueId || 'editor',
    //     value: defaultValAsRichText,
    //     ...plugins,
    //   });
    // }, [plugins]);

    const handleChange = useCallback(
      (newValue: TElement[]) => {
        const isActualChange = editor?.operations.some(
          (op: { type: string }) => 'set_selection' !== op.type
        );

        if (isActualChange)
          onChange({ target: { name: name, value: stripDropdownInputsFromValue(newValue) || [] } });
      },
      [editor, onChange]
    );

    useEffect(() => {
      if (autoFocus && editor) setTimeout(() => editor.tf.focus({ edge: 'endEditor' }));
    }, [autoFocus, editor]);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          if (editor) editor.tf.focus({ edge: 'endEditor' });
        },
        clear() {
          if (editor) editor.tf.reset();
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
                if (e.key === 'Enter' && !e.defaultPrevented) {
                  if (onSubmit) {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      onSubmit();
                    } else {
                      e.preventDefault();
                      editor.tf.insertBreak();
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

// This is somewhat of a hack; The inputs shouldn't be stored in the value, but that the easiest way to build them without building a hacky hidden input; So we choose the lesser evil
const stripDropdownInputsFromValue = (value: TElement[] | undefined): TElement[] | undefined => {
  if (!value) return undefined;
  return value
    .flatMap((element) => {
      if (element.type?.endsWith('_input')) {
        return element.children;
      } else if (element.children) {
        return {
          ...element,
          children: stripDropdownInputsFromValue(element.children as TElement[]),
        } as TElement;
      } else {
        return element;
      }
    })
    .filter(Boolean) as TElement[];
};

RichTextEditor.displayName = 'RichTextEditor';
export { RichTextEditor };
