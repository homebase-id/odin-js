/**
 * Footnotes (#518): `text[^1]` with `[^1]: note` at the end of the note.
 *
 * - `footnoteReference`: inline atom, `id` of its footnote. Its number is a
 *   decoration (`data-number`), so inserting, deleting or moving one renumbers
 *   every other for free.
 * - `footnotes`: the section at the end, `footnote+` in reference order.
 * - `footnote`: one note, `paragraph+`, with a back link to its reference.
 *
 * The plugin keeps the section in step with the references after every local
 * edit (`normalizeFootnotes`). Remote (Yjs) changes come normalized by the tab
 * that made them, so they are left alone: two tabs fixing the same merge at
 * once would each insert the section. No React, so headless code can use it.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { isRemoteChange } from '../lib/yjsKeys';
import { getNewId } from '@homebase-id/js-lib/helpers';
import { normalizeFootnotes } from '../lib/footnotes';
import { inListItem } from './markdownParse';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      /** Inserts a footnote reference at the selection and moves the cursor into its new note. */
      insertFootnote: () => ReturnType;
    };
  }
}

const idAttribute = {
  id: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('data-id') ?? '',
    renderHTML: (attrs: Record<string, unknown>) => ({ 'data-id': attrs.id }),
  },
};

/** Position of the first node of `type` with this `id`, or -1. */
function findById(doc: PMNode, type: string, id: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === type && node.attrs.id === id) found = pos;
    return found < 0;
  });
  return found;
}

function numberDecorations(doc: PMNode): DecorationSet {
  const numbers = new Map<string, number>();
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'footnoteReference') return;
    const id = node.attrs.id as string;
    if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
    const n = numbers.get(id);
    decorations.push(Decoration.node(pos, pos + node.nodeSize, { 'data-number': String(n), 'aria-label': `Footnote ${n}` }));
  });
  return DecorationSet.create(doc, decorations);
}

const footnotesKey = new PluginKey<DecorationSet>('footnotes');

// `[^label]: ` at the start of a line, and lines that start a block (they end a
// definition's lazy continuation).
const FOOTNOTE_DEFINITION = /^\[\^([^\]\s]+)\]:[ \t]?/;
const BLOCK_START = /^(\[\^[^\]\s]+\]:|#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~|\|)/;

export const FootnoteReference = Node.create({
  name: 'footnoteReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return idAttribute;
  },

  parseHTML() {
    // Above the Superscript mark's `sup` rule.
    return [{ tag: 'sup[data-type="footnote-reference"]', priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { 'data-type': 'footnote-reference', role: 'doc-noteref' })];
  },

  renderText: () => '',

  markdownTokenizer: {
    name: 'footnoteReference',
    level: 'inline',
    start: (src) => src.indexOf('[^'),
    tokenize(src) {
      const match = /^\[\^([^\]\s]+)\](?!:)/.exec(src);
      return match ? { type: 'footnoteReference', raw: match[0], label: match[1] } : undefined;
    },
  },

  // The label is the id until the edit engine points it at a real footnote.
  parseMarkdown: (token, helpers) => helpers.createNode('footnoteReference', { id: token.label }),

  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from, $to } = state.selection;
          const type = state.schema.nodes.footnoteReference;
          if (!$from.parent.canReplaceWith($from.index(), $to.index(), type)) return false;
          if (dispatch) {
            const id = getNewId();
            tr.replaceSelectionWith(type.create({ id }), false);
            normalizeFootnotes(tr);
            // Inside the first paragraph of the new note.
            tr.setSelection(TextSelection.create(tr.doc, findById(tr.doc, 'footnote', id) + 2)).scrollIntoView();
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    // Notes whose reference was deleted, so cutting and pasting one keeps its text.
    const removed = new Map<string, PMNode>();
    return [
      new Plugin({
        key: footnotesKey,
        state: {
          init: (_, state) => numberDecorations(state.doc),
          apply: (tr, old) => (tr.docChanged ? numberDecorations(tr.doc) : old),
        },
        appendTransaction(transactions, _, state) {
          const local = transactions.some((tr) => tr.docChanged && !isRemoteChange(tr));
          if (!local) return null;
          const tr = state.tr;
          return normalizeFootnotes(tr, removed) ? tr : null;
        },
        props: {
          decorations: (state) => footnotesKey.getState(state),
          handleDOMEvents: {
            // Reference -> its note, and the note's back link -> the reference.
            click(view, event) {
              const target = event.target instanceof Element ? event.target : null;
              const ref = target?.closest<HTMLElement>('sup[data-type="footnote-reference"]');
              const back = target?.closest('[data-footnote-backref]')?.closest<HTMLElement>('li[data-type="footnote"]');
              const id = ref?.dataset.id ?? back?.dataset.id;
              if (id === undefined) return false;
              const { doc } = view.state;
              const pos = findById(doc, ref ? 'footnote' : 'footnoteReference', id);
              const node = pos < 0 ? null : doc.nodeAt(pos);
              if (!node) return false;
              event.preventDefault();
              // A note: the cursor at the end of its text. A reference: the atom selected.
              const selection = ref ? TextSelection.create(doc, pos + node.nodeSize - 2) : NodeSelection.create(doc, pos);
              view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
              view.focus();
              return true;
            },
          },
        },
      }),
    ];
  },
});

export const Footnotes = Node.create({
  name: 'footnotes',
  group: 'block',
  content: 'footnote+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'section[data-type="footnotes"]', contentElement: 'ol' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, { 'data-type': 'footnotes', role: 'doc-endnotes' }), ['ol', 0]];
  },

  // One `[^label]: text` definition (continuation lines indented by 4 spaces).
  // The edit engine merges every parsed definition into one section at the end.
  markdownTokenizer: {
    name: 'footnotes',
    level: 'block',
    // Line where the next candidate starts, so marked ends a paragraph before it.
    start: (src) => {
      const match = /(^|\n)\[\^[^\]\s]+\]:/.exec(src);
      return match ? match.index + match[1].length : -1;
    },
    tokenize(src, tokens, lexer) {
      const match = FOOTNOTE_DEFINITION.exec(src);
      if (!match || inListItem(tokens)) return undefined;
      const lines = src.slice(match[0].length).split('\n');
      const body = [lines[0]];
      let end = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const indented = /^( {4}|\t)/.test(line);
        // After a blank line only an indented line continues the note; right
        // after text, any line that doesn't start a block does (lazy continuation).
        if (!indented && (i > end + 1 || BLOCK_START.test(line))) break;
        body.push(...lines.slice(end + 1, i).map(() => ''), line.replace(/^( {4}|\t)/, ''));
        end = i;
      }
      const raw = match[0] + lines.slice(0, end + 1).join('\n') + (end + 1 < lines.length ? '\n' : '');
      return { type: 'footnotes', raw, label: match[1], tokens: lexer.blockTokens(body.join('\n')) };
    },
  },

  parseMarkdown: (token, helpers) => {
    // A footnote holds paragraphs only.
    const paragraphs = helpers.parseChildren(token.tokens ?? []).filter((node) => node.type === 'paragraph');
    const note = helpers.createNode('footnote', { id: token.label }, paragraphs.length ? paragraphs : [{ type: 'paragraph' }]);
    return helpers.createNode('footnotes', null, [note]);
  },
});

export const Footnote = Node.create({
  name: 'footnote',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return idAttribute;
  },

  parseHTML() {
    return [{ tag: 'li[data-type="footnote"]', contentElement: '[data-footnote-content]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(HTMLAttributes, { 'data-type': 'footnote' }),
      ['button', { type: 'button', contenteditable: 'false', 'data-footnote-backref': '', 'aria-label': 'Back to reference' }, '↩'],
      ['div', { 'data-footnote-content': '' }, 0],
    ];
  },
});
