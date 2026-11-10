/**
 * Image gallery block (#601): two or more images side by side. Holds the existing
 * inline image node, so images (and their #583 captions) need no migration. `layout`
 * is row, grid, masonry or carousel (#602), picked in the toolbar above the gallery.
 *
 * Headless-safe: the plugins below only touch the DOM through an EditorView.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { isRemoteChange } from '../lib/yjsKeys';
import { inListItem } from './markdownParse';
import { GALLERY_LAYOUTS, createCarouselNav, galleryRowBreaks, toGalleryLayout, watchGalleryAspect } from './galleryLayout';
import { dropTargetAt, galleryDropPlugin } from './galleryDrag';

export const GALLERY = 'gallery';

// What fragmentToMarkdown emits before the images of a gallery.
const GALLERY_MARKDOWN_OPEN = /^<div data-gallery="([a-z]+)">\n\n/;
const GALLERY_MARKDOWN_CLOSE = /^<\/div>$/m;

/** Calls `visit` on every gallery in `doc`, without walking into textblocks. */
function eachGallery(doc: PMNode, visit: (gallery: PMNode, pos: number) => void): void {
  doc.descendants((node, pos) => {
    if (node.type.name === GALLERY) visit(node, pos);
    return !node.isTextblock;
  });
}

/**
 * A gallery left with fewer than two images (one deleted, say) becomes a plain
 * paragraph holding what is left. Remote and undo changes are left alone: the
 * device that made them already did this, and doing it twice would duplicate it.
 */
export function unwrapSmallGalleries(transactions: readonly Transaction[], state: EditorState): Transaction | null {
  if (!transactions.some((tr) => tr.docChanged && !isRemoteChange(tr))) return null;
  let tr: Transaction | null = null;
  eachGallery(state.doc, (gallery, pos) => {
    if (gallery.childCount < 2) tr = (tr ?? state.tr).setNodeMarkup(pos, state.schema.nodes.paragraph);
  });
  return tr;
}

/** A zero-height element that starts a new row (galleryLayout.ts). */
function rowBreak(modes: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'gallery-break';
  el.dataset.rowBreak = modes;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function rowBreakDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  eachGallery(doc, (gallery, pos) => {
    if (gallery.attrs.layout !== 'row') return;
    const starts: number[] = [];
    gallery.forEach((_child, offset) => starts.push(pos + 1 + offset));
    for (const { index, modes } of galleryRowBreaks(gallery.childCount)) {
      const key = modes.join(' ');
      decorations.push(Decoration.widget(starts[index], () => rowBreak(key), { key: `gallery-break-${key}`, side: -1 }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const Gallery = Node.create({
  name: GALLERY,
  group: 'block',
  content: 'image+',

  addAttributes() {
    return {
      layout: {
        default: 'row',
        parseHTML: (el) => toGalleryLayout(el.getAttribute('data-gallery')),
        renderHTML: (attrs) => ({ 'data-gallery': attrs.layout }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-gallery]' }];
  },

  // Over an image the drop indicator (galleryDrag.ts) stands in for ProseMirror's drop cursor
  extendNodeSchema(extension) {
    if (extension.name !== 'image') return {};
    return { disableDropCursor: (view: EditorView, _pos: unknown, event: DragEvent) => dropTargetAt(view, event) !== null };
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  // Markdown -> gallery. Only the agent edit engine parses markdown; it keeps the
  // images (raw <img> tags included) and drops the spaces between them.
  markdownTokenizer: {
    name: GALLERY,
    level: 'block',
    // Line where the next candidate starts, so marked ends a paragraph before it.
    start: (src) => {
      const at = src.indexOf('\n<div data-gallery="');
      return at < 0 ? -1 : at + 1;
    },
    tokenize(src, tokens, lexer) {
      const open = GALLERY_MARKDOWN_OPEN.exec(src);
      if (!open || inListItem(tokens)) return undefined;
      const close = GALLERY_MARKDOWN_CLOSE.exec(src.slice(open[0].length));
      if (!close) return undefined;
      const body = src.slice(open[0].length, open[0].length + close.index);
      if (!body.endsWith('\n\n')) return undefined;
      return {
        type: GALLERY,
        raw: src.slice(0, open[0].length + close.index + close[0].length),
        layout: toGalleryLayout(open[1]),
        tokens: lexer.blockTokens(body.slice(0, -2)),
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const blocks = (helpers.parseBlockChildren ?? helpers.parseChildren)(token.tokens ?? []);
    const inline = blocks.flatMap((block) => (block.type === 'paragraph' ? (block.content ?? []) : [block]));
    return helpers.createNode(GALLERY, { layout: token.layout }, inline);
  },

  // The images sit in the inner element; the layout picker and the carousel's nav
  // beside them, outside what ProseMirror owns.
  addNodeView() {
    return ({ node: initial, editor, getPos }) => {
      let node = initial;
      const dom = document.createElement('div');
      dom.className = 'gallery-block';
      const contentDOM = document.createElement('div');
      const bar = document.createElement('div');
      bar.className = 'gallery-toolbar';
      bar.contentEditable = 'false';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', 'Gallery layout');
      const buttons = GALLERY_LAYOUTS.map((layout) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = layout[0].toUpperCase() + layout.slice(1);
        el.addEventListener('mousedown', (e) => e.preventDefault());
        el.addEventListener('click', () => {
          const pos = getPos();
          if (pos !== undefined) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, layout }));
        });
        return [layout, el] as const;
      });
      bar.append(...buttons.map(([, el]) => el));
      const carousel = createCarouselNav(contentDOM, dom);
      dom.append(bar, contentDOM, carousel.nav);

      const sync = () => {
        const layout = toGalleryLayout(node.attrs.layout);
        contentDOM.dataset.gallery = layout;
        carousel.nav.hidden = layout !== 'carousel';
        for (const [name, el] of buttons) el.setAttribute('aria-pressed', String(name === layout));
      };
      sync();
      return {
        dom,
        contentDOM,
        update: (updated) => {
          if (updated.type !== node.type) return false;
          node = updated;
          sync();
          return true;
        },
        ignoreMutation: (mutation) => mutation.type !== 'selection' && !contentDOM.contains(mutation.target),
        stopEvent: (event) => event.target instanceof HTMLElement && (bar.contains(event.target) || carousel.nav.contains(event.target)),
        destroy: carousel.destroy,
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('galleryUnwrap'),
        appendTransaction: (transactions, _old, state) => unwrapSmallGalleries(transactions, state),
      }),
      new Plugin({
        key: new PluginKey('galleryRows'),
        props: { decorations: (state) => rowBreakDecorations(state.doc) },
        view: (view) => ({ destroy: watchGalleryAspect(view.dom) }),
      }),
      galleryDropPlugin(),
    ];
  },
});
