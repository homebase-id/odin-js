/**
 * Converts between the feed's Slate article bodies (Plate, `RichText` in js-lib) and
 * this package's Tiptap JSON.
 *
 * - `slateToTiptap` reads any body the feed has stored: the Plate editor's output, the
 *   importers' (WordPress, social sync) and plain strings. Nothing that holds text is dropped.
 * - `tiptapToSlate` writes the reduced copy old clients read from `body`. It only uses the
 *   types the old `RichTextRenderer` knows, so every piece of text still shows, flattened
 *   where the old renderer has no equivalent (tables, callouts, toggles, math, footnotes).
 */
import type { JSONContent } from '@tiptap/core';

export type SlateNode = Record<string, unknown> & { type?: string; text?: string; children?: SlateNode[] };
type Mark = { type: string; attrs?: Record<string, unknown> };

/** The Slate types `RichTextRenderer` renders; `tiptapToSlate` writes only these. */
export const OLD_RENDERER_TYPES = ['p', 'h1', 'h2', 'blockquote', 'code_block', 'code_line', 'ul', 'ol', 'li', 'lic', 'a', 'local_image', 'mention'] as const;

const SLATE_MARKS: Record<string, string> = { bold: 'bold', strong: 'bold', italic: 'italic', underline: 'underline', strikethrough: 'strike', code: 'code', kbd: 'kbd' };
const TIPTAP_MARKS: Record<string, string> = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikethrough', code: 'code', kbd: 'kbd' };

// ---- Slate -> Tiptap ----

// The WordPress importer writes marks as wrapper elements: `{ type: 'strong', children }`.
const WRAPPER_MARKS: Record<string, string> = { strong: 'bold', b: 'bold', em: 'italic', i: 'italic', u: 'underline', s: 'strike', del: 'strike', code: 'code', kbd: 'kbd', span: '' };

const isSlateInline = (n: SlateNode) =>
  !n.type || n.type === 'text' || n.type === 'a' || n.type === 'mention' || n.type in WRAPPER_MARKS;

function inlineToTiptap(n: SlateNode, marks: Mark[]): JSONContent[] {
  if (n.type === 'mention') return typeof n.value === 'string' && n.value ? [{ type: 'mention', attrs: { id: n.value, label: null } }] : [];
  if (n.type === 'a') {
    const link = { type: 'link', attrs: { href: String(n.url ?? '') } };
    // The importers write `{ type: 'a', url, text }` with no children.
    const children = n.children?.length ? n.children : [{ text: String(n.text ?? n.url ?? '') }];
    return children.flatMap((c) => inlineToTiptap(c, [...marks, link]));
  }
  if (n.type && n.type in WRAPPER_MARKS) {
    const mark = WRAPPER_MARKS[n.type];
    return (n.children ?? []).flatMap((c) => inlineToTiptap(c, mark ? [...marks, { type: mark }] : marks));
  }
  if (n.children) return n.children.flatMap((c) => inlineToTiptap(c, marks)); // an unknown inline wrapper
  const text = typeof n.text === 'string' ? n.text : '';
  if (!text) return []; // Tiptap has no empty text nodes
  const own = Object.keys(SLATE_MARKS).filter((k) => n[k]).map((k) => ({ type: SLATE_MARKS[k] }));
  const all = [...own.filter((m, i) => own.findIndex((o) => o.type === m.type) === i), ...marks];
  // A soft line break inside a block is a hard break in Tiptap.
  return text.split('\n').flatMap((line, i) => [
    ...(i ? [{ type: 'hardBreak' }] : []),
    ...(line ? [{ type: 'text', text: line, ...(all.length ? { marks: all } : {}) }] : []),
  ]);
}

const inlines = (children: SlateNode[] | undefined) => (children ?? []).flatMap((c) => inlineToTiptap(c, []));
const paragraph = (content: JSONContent[]): JSONContent => (content.length ? { type: 'paragraph', content } : { type: 'paragraph' });

/** Block children, with runs of inline children wrapped in paragraphs. */
function blocksToTiptap(children: SlateNode[] | undefined): JSONContent[] {
  const out: JSONContent[] = [];
  let run: SlateNode[] = [];
  const flush = () => {
    if (run.length) out.push(paragraph(inlines(run)));
    run = [];
  };
  for (const c of children ?? []) {
    if (isSlateInline(c)) run.push(c);
    else {
      flush();
      out.push(...blockToTiptap(c));
    }
  }
  flush();
  return out;
}

const textOf = (n: SlateNode): string =>
  typeof n.text === 'string' ? n.text : (n.children ?? []).map(textOf).join('');

function imageNode(n: SlateNode, caption: string | null = null): JSONContent {
  return n.type === 'local_image'
    ? { type: 'image', attrs: { fileKey: n.fileKey ?? null, fileId: n.fileId ?? null, ...(caption ? { caption } : {}) } }
    : { type: 'image', attrs: { src: String(n.url ?? n.src ?? ''), ...(caption ? { caption } : {}) } };
}

function listItemToTiptap(li: SlateNode): JSONContent {
  const content: JSONContent[] = [];
  for (const c of li.children ?? []) {
    if (c.type === 'lic') content.push(paragraph(inlines(c.children)));
    else if (c.type === 'ul' || c.type === 'ol') content.push(...blockToTiptap(c));
    else content.push(...blocksToTiptap([c]));
  }
  // A list item starts with a paragraph.
  if (content[0]?.type !== 'paragraph') content.unshift({ type: 'paragraph' });
  return { type: 'listItem', content };
}

function blockToTiptap(n: SlateNode): JSONContent[] {
  const heading = /^h([1-6])$/.exec(n.type ?? '');
  if (heading) return [{ type: 'heading', attrs: { level: Number(heading[1]) }, content: inlines(n.children) }];

  switch (n.type) {
    case 'p':
    case 'paragraph':
      return [paragraph(inlines(n.children))];
    case 'blockquote':
      return [{ type: 'blockquote', content: blocksToTiptap(n.children).length ? blocksToTiptap(n.children) : [{ type: 'paragraph' }] }];
    case 'code_block': {
      const code = (n.children ?? []).map(textOf).join('\n');
      return [{ type: 'codeBlock', attrs: { language: (n.lang as string) || null }, ...(code ? { content: [{ type: 'text', text: code }] } : {}) }];
    }
    case 'ul':
    case 'ol': {
      const items = (n.children ?? []).map((c) => (c.type === 'li' ? listItemToTiptap(c) : listItemToTiptap({ children: [c] })));
      if (!items.length) return [];
      return [n.type === 'ul' ? { type: 'bulletList', content: items } : { type: 'orderedList', attrs: { start: 1 }, content: items }];
    }
    case 'local_image':
    case 'image':
    case 'img':
      return [paragraph([imageNode(n)])];
    case 'figure': {
      // The WordPress importer: `figure` > `image` | `local_image`, `figcaption`.
      const img = n.children?.find((c) => c.type === 'local_image' || c.type === 'image' || c.type === 'img');
      const caption = n.children?.find((c) => c.type === 'figcaption');
      if (!img) return blocksToTiptap(n.children);
      return [paragraph([imageNode(img, caption ? textOf(caption) : null)])];
    }
    case 'link': {
      // The importers' link button: `{ type: 'link', linkText, linkTarget }`.
      const text = String(n.linkText ?? n.linkTarget ?? '');
      return text ? [paragraph([{ type: 'text', text, marks: [{ type: 'link', attrs: { href: String(n.linkTarget ?? '') } }] }])] : [];
    }
    default:
      // Unknown type: keep what it holds.
      return blocksToTiptap(n.children);
  }
}

/** A Tiptap document for any stored Slate body (array, plain string or nothing). */
export function slateToTiptap(body: string | SlateNode[] | undefined | null): JSONContent {
  const content =
    typeof body === 'string'
      ? body.split('\n').map((line) => paragraph(line ? [{ type: 'text', text: line }] : []))
      : Array.isArray(body)
        ? blocksToTiptap(body)
        : [];
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

// ---- Tiptap -> Slate (the reduced copy) ----

const emptyLeaf = (): SlateNode[] => [{ text: '' }];
const nonEmpty = (children: SlateNode[]) => (children.length ? children : emptyLeaf());

function inlineToSlate(n: JSONContent, ctx: Ctx): SlateNode[] {
  switch (n.type) {
    case 'text': {
      const leaf: SlateNode = { text: n.text ?? '' };
      for (const m of n.marks ?? []) if (TIPTAP_MARKS[m.type]) leaf[TIPTAP_MARKS[m.type]] = true;
      const link = n.marks?.find((m) => m.type === 'link');
      return [link ? { type: 'a', url: link.attrs?.href ?? '', children: [leaf] } : leaf];
    }
    case 'hardBreak':
      return [{ text: '\n' }];
    case 'mention':
      return [{ type: 'mention', value: n.attrs?.id ?? '', children: emptyLeaf() }];
    case 'inlineMath':
      return [{ text: n.attrs?.latex ?? '', code: true }];
    case 'footnoteReference':
      return [{ text: `[${ctx.footnoteNumber(n.attrs?.id)}]` }];
    case 'image':
      return []; // lifted out of the paragraph by `paragraphToSlate`
    default:
      return (n.content ?? []).flatMap((c) => inlineToSlate(c, ctx));
  }
}

const inlinesToSlate = (content: JSONContent[] | undefined, ctx: Ctx) => (content ?? []).flatMap((c) => inlineToSlate(c, ctx));

/** Merges adjacent Slate text leaves with the same marks, as Slate does on normalize. */
function mergeLeaves(children: SlateNode[]): SlateNode[] {
  const out: SlateNode[] = [];
  for (const c of children) {
    const prev = out[out.length - 1];
    const sameMarks = (a: SlateNode, b: SlateNode) => {
      const keys = (x: SlateNode) => Object.keys(x).filter((k) => k !== 'text').sort().join();
      return keys(a) === keys(b);
    };
    if (prev && !prev.type && !c.type && typeof prev.text === 'string' && typeof c.text === 'string' && sameMarks(prev, c))
      out[out.length - 1] = { ...prev, text: prev.text + c.text };
    else out.push(c);
  }
  return out;
}

const textBlock = (type: string, content: JSONContent[] | undefined, ctx: Ctx): SlateNode => ({
  type,
  children: nonEmpty(mergeLeaves(inlinesToSlate(content, ctx))),
});

function imageToSlate(img: JSONContent): SlateNode[] {
  const { fileKey, fileId, src, alt, caption } = img.attrs ?? {};
  const out: SlateNode[] = [];
  if (fileKey) out.push({ type: 'local_image', fileKey, ...(fileId ? { fileId } : {}), children: emptyLeaf() });
  else if (src && !String(src).startsWith('data:')) out.push({ type: 'p', children: [{ type: 'a', url: src, children: [{ text: alt || src }] }] });
  // null caption shows the alt text; "" hides it.
  const shown = caption ?? alt;
  if (shown) out.push({ type: 'p', children: [{ text: shown, italic: true }] });
  return out;
}

/** A paragraph's images become blocks of their own around its text. */
function paragraphToSlate(n: JSONContent, ctx: Ctx, type = 'p'): SlateNode[] {
  const images = (n.content ?? []).filter((c) => c.type === 'image');
  const rest = (n.content ?? []).filter((c) => c.type !== 'image');
  const out: SlateNode[] = [];
  if (rest.length || !images.length) out.push(textBlock(type, rest, ctx));
  for (const img of images) out.push(...imageToSlate(img));
  return out;
}

/** The text of a container's blocks, one line each, as one inline run. */
function flatInlines(blocks: JSONContent[] | undefined, ctx: Ctx): SlateNode[] {
  return mergeLeaves(
    blocksToSlate(blocks, ctx).flatMap((b, i) => [...(i ? [{ text: '\n' }] : []), ...flatten(b)]),
  );
}

/** A Slate block's inline content; nested blocks are joined by line breaks. */
function flatten(b: SlateNode): SlateNode[] {
  if (b.type === 'a' || b.type === 'mention' || !b.type) return [b];
  if (b.type === 'local_image') return [];
  return (b.children ?? []).flatMap((c, i) =>
    c.type && !['a', 'mention'].includes(c.type) ? [...(i ? [{ text: '\n' }] : []), ...flatten(c)] : [c],
  );
}

function listToSlate(n: JSONContent, ctx: Ctx, type: 'ul' | 'ol', prefix?: (item: JSONContent) => string): SlateNode {
  return {
    type,
    children: (n.content ?? []).map((item) => {
      const [first, ...rest] = item.content ?? [];
      const lic: SlateNode = first?.type === 'paragraph' ? textBlock('lic', first.content, ctx) : { type: 'lic', children: emptyLeaf() };
      if (prefix) lic.children = mergeLeaves([{ text: prefix(item) }, ...(lic.children ?? [])]);
      const nested = (first?.type === 'paragraph' ? rest : item.content ?? []).flatMap((c) =>
        c.type === 'bulletList' || c.type === 'orderedList' || c.type === 'taskList' ? blockToSlate(c, ctx) : [{ type: 'lic', children: nonEmpty(flatInlines([c], ctx)) }],
      );
      return { type: 'li', children: [lic, ...nested] };
    }),
  };
}

function blockToSlate(n: JSONContent, ctx: Ctx): SlateNode[] {
  switch (n.type) {
    case 'paragraph':
      return paragraphToSlate(n, ctx);
    case 'heading':
      // The old renderer has h1 and h2 only.
      return paragraphToSlate(n, ctx, (n.attrs?.level ?? 1) <= 1 ? 'h1' : 'h2');
    case 'blockquote':
    case 'callout':
      return [{ type: 'blockquote', children: nonEmpty(flatInlines(n.content, ctx)) }];
    case 'codeBlock':
    case 'blockMath': {
      const code = n.type === 'blockMath' ? String(n.attrs?.latex ?? '') : (n.content ?? []).map((c) => c.text ?? '').join('');
      const lang = n.type === 'blockMath' ? 'latex' : n.attrs?.language;
      return [{ type: 'code_block', ...(lang ? { lang } : {}), children: code.split('\n').map((line) => ({ type: 'code_line', children: [{ text: line }] })) }];
    }
    case 'bulletList':
      return [listToSlate(n, ctx, 'ul')];
    case 'orderedList':
      return [listToSlate(n, ctx, 'ol')];
    case 'taskList':
      return [listToSlate(n, ctx, 'ul', (item) => (item.attrs?.checked ? '☑ ' : '☐ '))];
    case 'table':
      // One paragraph per row, cells separated by " | "; header cells bold.
      return (n.content ?? []).map((row) => ({
        type: 'p',
        children: nonEmpty(
          mergeLeaves(
            (row.content ?? []).flatMap((cell, i) => {
              const text = flatInlines(cell.content, ctx).map((l) => (cell.type === 'tableHeader' && !l.type ? { ...l, bold: true } : l));
              return [...(i ? [{ text: ' | ' }] : []), ...text];
            }),
          ),
        ),
      }));
    case 'toggle':
      return [{ type: 'p', children: [{ text: String(n.attrs?.summary ?? ''), bold: true }] }, ...blocksToSlate(n.content, ctx)];
    case 'gallery':
      return (n.content ?? []).flatMap(imageToSlate);
    case 'linkPreview': {
      const url = String(n.attrs?.url ?? '');
      return url ? [{ type: 'p', children: [{ type: 'a', url, children: [{ text: String(n.attrs?.title || url) }] }] }] : [];
    }
    case 'footnotes':
      return [
        { type: 'p', children: [{ text: 'Notes', bold: true }] },
        {
          type: 'ol',
          children: (n.content ?? []).map((fn) => ({ type: 'li', children: [{ type: 'lic', children: nonEmpty(flatInlines(fn.content, ctx)) }] })),
        },
      ];
    case 'horizontalRule':
      return [];
    default:
      // Unknown block: keep its text.
      return n.content?.length ? [{ type: 'p', children: nonEmpty(flatInlines(n.content, ctx)) }] : [];
  }
}

type Ctx = { footnoteNumber: (id: unknown) => number };

const blocksToSlate = (blocks: JSONContent[] | undefined, ctx: Ctx) => (blocks ?? []).flatMap((b) => blockToSlate(b, ctx));

/** The reduced Slate copy of a Tiptap document, for old clients reading `body`. */
export function tiptapToSlate(doc: JSONContent): SlateNode[] {
  // Footnotes are numbered by their order in the footnotes section.
  const ids = (doc.content ?? []).filter((b) => b.type === 'footnotes').flatMap((s) => (s.content ?? []).map((fn) => fn.attrs?.id));
  const ctx: Ctx = { footnoteNumber: (id) => ids.indexOf(id) + 1 || ids.length + 1 };
  const out = blocksToSlate(doc.content, ctx);
  return out.length ? out : [{ type: 'p', children: emptyLeaf() }];
}

/** Plain text of a Tiptap document, block by block: for reading time and the harness. */
export function tiptapText(n: JSONContent): string {
  if (n.type === 'text') return n.text ?? '';
  if (n.type === 'hardBreak') return '\n';
  if (n.type === 'mention') return `@${n.attrs?.id ?? ''}`;
  if (n.type === 'inlineMath' || n.type === 'blockMath') return String(n.attrs?.latex ?? '');
  if (n.type === 'toggle') return [n.attrs?.summary, ...(n.content ?? []).map(tiptapText)].filter(Boolean).join('\n');
  if (n.type === 'linkPreview') return String(n.attrs?.title || n.attrs?.url || '');
  if (n.type === 'image') return String(n.attrs?.caption ?? n.attrs?.alt ?? '');
  const inline = n.type === 'paragraph' || n.type === 'heading' || n.type === 'codeBlock';
  return (n.content ?? []).map(tiptapText).join(inline ? '' : '\n');
}
