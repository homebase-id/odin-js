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
} from '@udecode/plate-common';
import { withProps } from '@udecode/cn';
import { createParagraphPlugin, ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph';
import { createHeadingPlugin, ELEMENT_H1, ELEMENT_H2 } from '@udecode/plate-heading';
import { createBlockquotePlugin, ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote';
import {
  createCodeBlockPlugin,
  ELEMENT_CODE_BLOCK,
  ELEMENT_CODE_LINE,
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

import { createComboboxPlugin, TComboboxItem } from '@udecode/plate-combobox';
import { createEmojiPlugin } from '@udecode/plate-emoji';

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

import { RichText } from '@youfoundation/js-lib/core';
import { useDarkMode } from '@youfoundation/common-app';

import { createImagePlugin, ELEMENT_IMAGE, MediaOptions } from './ImagePlugin/ImagePlugin';
import { useState, useEffect } from 'react';
import { autoformatRules } from '../lib/autoFormatRules';
import { EmojiCombobox } from './Combobox/EmojiCombobox';
import { createMentionPlugin, ELEMENT_MENTION } from '@udecode/plate-mention';
import { MentionCombobox } from './Combobox/MentionCombobox';
import { MentionElement } from '../components/plate-ui/mention-element';

export const RichTextEditor = ({
  defaultValue,
  placeholder,
  mediaOptions,
  mentionables,
  name = 'richText',
  onChange,
  className,
  disabled,
  uniqueId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any[] | string | undefined;
  placeholder?: string;
  mediaOptions?: MediaOptions;
  mentionables?: TComboboxItem[];
  name: string;
  onChange: (e: { target: { name: string; value: RichText } }) => void;
  className?: string;
  disabled?: boolean;
  uniqueId?: string;
}) => {
  const { isDarkMode } = useDarkMode();

  const plugins = createPlugins(
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
      createSoftBreakPlugin({
        options: {
          rules: [{ hotkey: 'shift+enter' }],
        },
      }),
      createTabbablePlugin(),
      createTrailingBlockPlugin({
        options: { type: ELEMENT_PARAGRAPH },
      }),
      createDeserializeHtmlPlugin(),
      createDeserializeMdPlugin(),
      createComboboxPlugin(),
      createEmojiPlugin(),
      createMentionPlugin(),
      createImagePlugin({ options: mediaOptions }),
    ],
    {
      components: {
        [ELEMENT_BLOCKQUOTE]: BlockquoteElement,
        [ELEMENT_CODE_BLOCK]: CodeBlockElement,
        [ELEMENT_CODE_LINE]: CodeLineElement,
        [ELEMENT_LINK]: LinkElement,
        [ELEMENT_H1]: withProps(HeadingElement, { variant: 'h1' }),
        [ELEMENT_H2]: withProps(HeadingElement, { variant: 'h2' }),
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
        [ELEMENT_MENTION]: MentionElement,
      },
    }
  );

  const [innerEditor, setInnerEditor] = useState<PlateEditor<Value>>();
  const EditorExposer = () => {
    const editor = useEditorRef(usePlateId());

    useEffect(() => {
      setInnerEditor(editor);
    }, [editor]);

    return null;
  };

  const defaultValAsRichText: TElement[] | undefined =
    defaultValue && Array.isArray(defaultValue)
      ? (defaultValue as TElement[])
      : defaultValue && typeof defaultValue === 'string'
        ? ([
            {
              type: 'paragraph',
              children: [{ text: defaultValue ?? '' }] as TDescendant[],
            },
          ] as TElement[])
        : undefined;

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
        className={`relative flex w-[100%] flex-col ${className ?? ''}`}
        onSubmit={(e) => e.stopPropagation()}
        onClick={disabled ? undefined : (e) => e.stopPropagation()}
      >
        <Plate
          id={uniqueId}
          initialValue={defaultValAsRichText}
          plugins={plugins}
          onChange={(newValue) => {
            const isActualChange = innerEditor?.operations.some(
              (op: { type: string }) => 'set_selection' !== op.type
            );

            if (isActualChange) onChange({ target: { name: name, value: newValue } });
          }}
          readOnly={disabled}
          // Switch keys to reset the editor when going to enabled
          key={disabled ? 'disabled' : undefined}
        >
          <FixedToolbar>
            <FixedToolbarButtons mediaOptions={mediaOptions} />
          </FixedToolbar>

          <PlateContent placeholder={placeholder} />
          <EmojiCombobox />
          {mentionables?.length ? <MentionCombobox items={mentionables} /> : null}

          <EditorExposer />
        </Plate>
      </section>
    </>
  );
};

// const MENTIONABLES: TComboboxItem[] = [
//   { key: '0', text: 'Aayla Secura' },
//   { key: '1', text: 'Adi Gallia' },
//   {
//     key: '2',
//     text: 'Admiral Dodd Rancit',
//   },
//   {
//     key: '3',
//     text: 'Admiral Firmus Piett',
//   },
//   {
//     key: '4',
//     text: 'Admiral Gial Ackbar',
//   },
//   { key: '5', text: 'Admiral Ozzel' },
//   { key: '6', text: 'Admiral Raddus' },
//   {
//     key: '7',
//     text: 'Admiral Terrinald Screed',
//   },
//   { key: '8', text: 'Admiral Trench' },
//   {
//     key: '9',
//     text: 'Admiral U.O. Statura',
//   },
//   { key: '10', text: 'Agen Kolar' },
//   { key: '11', text: 'Agent Kallus' },
//   {
//     key: '12',
//     text: 'Aiolin and Morit Astarte',
//   },
//   { key: '13', text: 'Aks Moe' },
//   { key: '14', text: 'Almec' },
//   { key: '15', text: 'Alton Kastle' },
//   { key: '16', text: 'Amee' },
//   { key: '17', text: 'AP-5' },
//   { key: '18', text: 'Armitage Hux' },
//   { key: '19', text: 'Artoo' },
//   { key: '20', text: 'Arvel Crynyd' },
//   { key: '21', text: 'Asajj Ventress' },
//   { key: '22', text: 'Aurra Sing' },
//   { key: '23', text: 'AZI-3' },
//   { key: '24', text: 'Bala-Tik' },
//   { key: '25', text: 'Barada' },
//   { key: '26', text: 'Bargwill Tomder' },
//   { key: '27', text: 'Baron Papanoida' },
//   { key: '28', text: 'Barriss Offee' },
//   { key: '29', text: 'Baze Malbus' },
//   { key: '30', text: 'Bazine Netal' },
//   { key: '31', text: 'BB-8' },
//   { key: '32', text: 'BB-9E' },
//   { key: '33', text: 'Ben Quadinaros' },
//   { key: '34', text: 'Berch Teller' },
//   { key: '35', text: 'Beru Lars' },
//   { key: '36', text: 'Bib Fortuna' },
//   {
//     key: '37',
//     text: 'Biggs Darklighter',
//   },
//   { key: '38', text: 'Black Krrsantan' },
//   { key: '39', text: 'Bo-Katan Kryze' },
//   { key: '40', text: 'Boba Fett' },
//   { key: '41', text: 'Bobbajo' },
//   { key: '42', text: 'Bodhi Rook' },
//   { key: '43', text: 'Borvo the Hutt' },
//   { key: '44', text: 'Boss Nass' },
//   { key: '45', text: 'Bossk' },
//   {
//     key: '46',
//     text: 'Breha Antilles-Organa',
//   },
//   { key: '47', text: 'Bren Derlin' },
//   { key: '48', text: 'Brendol Hux' },
//   { key: '49', text: 'BT-1' },
// ];
