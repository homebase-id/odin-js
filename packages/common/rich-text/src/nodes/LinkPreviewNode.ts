/**
 * Link preview card (#173) — schema, paste handler and convert command only.
 * The React node view (LinkPreviewNodeView) is layered on in
 * editorExtensions.ts so headless code keeps a React-free schema.
 *
 * Pasting a lone http(s) URL into an empty paragraph replaces that paragraph
 * with a card; the node view then fills title/description/image in. Any other
 * paste falls through to the Link mark's `linkOnPaste` / autolink behaviour.
 */
import { Node } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { isPreviewableUrl } from '../lib/linkPreview';
import { inListItem } from './markdownParse';

// A line as previewToMarkdown writes it (#561): `[title](url)`, `<url>` or a bare URL, then
// `<!-- preview -->`. Only the URL is kept: the node view fetches the rest, as for a paste.
const PREVIEW_LINE = /^(?:\[(?:\\.|[^\\\]\n])*\]\((\S+)\)|<(\S+)>|(\S+?))[ \t]*<!-- preview -->[ \t]*(?:\n|$)/;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkPreview: {
      /** Replaces the card at `pos` with a paragraph holding a plain link. */
      convertLinkPreviewToLink: (pos: number) => ReturnType;
    };
  }
}

export const LinkPreview = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        // Pasted HTML is untrusted: only an http(s) URL survives.
        parseHTML: (el) => {
          const url = el.getAttribute('data-url') ?? '';
          return isPreviewableUrl(url) ? url.trim() : '';
        },
        renderHTML: () => ({}),
      },
      title: { default: '', rendered: false },
      description: { default: '', rendered: false },
      image: { default: null, rendered: false },
      imageWidth: { default: null, rendered: false },
      imageHeight: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-link-preview]' }];
  },

  renderHTML({ node }) {
    const { url, title } = node.attrs;
    return [
      'div',
      { 'data-link-preview': '', 'data-url': url },
      ['a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, title || url],
    ];
  },

  renderText({ node }) {
    return node.attrs.url;
  },

  // Markdown -> card (#561). Only the agent edit engine and markdown import parse markdown.
  markdownTokenizer: {
    name: 'linkPreview',
    level: 'block',
    // Line where the next candidate starts. Without a `start`, tiptap lexes with a second lexer,
    // which steals the paragraphs' inline lexing.
    start: (src) => {
      const at = /(^|\n)[^\n]*<!-- preview -->/.exec(src);
      return at ? at.index + at[1].length : -1;
    },
    tokenize(src, tokens) {
      const line = PREVIEW_LINE.exec(src);
      const url = line && (line[1] ?? line[2] ?? line[3]);
      // A list item's first paragraph can't be a card.
      if (!line || !url || !isPreviewableUrl(url) || inListItem(tokens)) return undefined;
      return { type: 'linkPreview', raw: line[0], url };
    },
  },

  parseMarkdown: (token, helpers) => helpers.createNode('linkPreview', { url: token.url }),

  addCommands() {
    return {
      convertLinkPreviewToLink:
        (pos) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type !== this.type) return false;
          const { url, title } = node.attrs;
          const { link } = state.schema.marks;
          const text = state.schema.text(title || url, link ? [link.create({ href: url })] : []);
          if (dispatch) tr.replaceWith(pos, pos + node.nodeSize, state.schema.nodes.paragraph.create(null, text));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey('linkPreviewPaste'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (!isPreviewableUrl(text)) return false;
            const { selection } = view.state;
            const { $from } = selection;
            const para = $from.parent;
            if (!selection.empty || para.type.name !== 'paragraph' || para.content.size > 0) return false;
            // e.g. a list item's first paragraph can't become a card.
            const index = $from.index(-1);
            if (!$from.node(-1).canReplaceWith(index, index + 1, type)) return false;

            const pos = $from.before();
            const tr = view.state.tr.replaceWith(pos, $from.after(), type.create({ url: text.trim() }));
            view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, pos)).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
