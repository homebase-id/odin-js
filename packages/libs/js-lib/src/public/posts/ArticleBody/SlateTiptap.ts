/**
 * Converts between the feed's Slate article bodies (Plate, `RichText` in js-lib) and
 * the Tiptap JSON of Journal's editor.
 *
 * - `slateToTiptap` reads any body the feed has stored: the Plate editor's output, the
 *   importers' (WordPress, social sync) and plain strings. Nothing that holds text is dropped.
 * - `tiptapToSlate` writes the reduced copy old clients read from `body`. It only uses the
 *   types the old `RichTextRenderer` knows, so every piece of text still shows, flattened
 *   where the old renderer has no equivalent (tables, callouts, toggles, math, footnotes).
 *
 * None of them throws on malformed input (null entries, a string where a node should be, children
 * that aren't an array, a non-string type): both directions clean their input first and keep
 * whatever text they can find.
 */
import { codeLanguage } from './CodeLanguage';

/**
 * A Tiptap (ProseMirror) JSON node, as `editor.getJSON()` writes it. The same shape as
 * `JSONContent` from `@tiptap/core`, written out so js-lib needs no Tiptap dependency.
 */
export interface TiptapJSONContent {
  type?: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  attrs?: Record<string, any>;
  content?: TiptapJSONContent[];
  marks?: { type: string; attrs?: Record<string, any>; [key: string]: any }[];
  text?: string;
  [key: string]: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export type SlateNode = Record<string, unknown> & { type?: string; text?: string; children?: SlateNode[] };
type Mark = { type: string; attrs?: Record<string, unknown> };

/** The Slate types `RichTextRenderer` renders; `tiptapToSlate` writes only these. */
export const OLD_RENDERER_TYPES = ['p', 'h1', 'h2', 'blockquote', 'code_block', 'code_line', 'ul', 'ol', 'li', 'lic', 'a', 'local_image', 'mention'] as const;

const SLATE_MARKS: Record<string, string> = { bold: 'bold', strong: 'bold', italic: 'italic', underline: 'underline', strikethrough: 'strike', code: 'code', kbd: 'kbd' };
const TIPTAP_MARKS: Record<string, string> = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikethrough', code: 'code', kbd: 'kbd' };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasOwn = (map: object, key: unknown): key is string => typeof key === 'string' && Object.hasOwn(map, key);
const stringOr = <T>(v: unknown, fallback: T): string | T => (typeof v === 'string' ? v : fallback);
/** A text field as a string: numbers and booleans are kept as their text, anything else is empty. */
const textField = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

// ---- Slate -> Tiptap ----

/**
 * Stored Slate nodes in the shape the converter expects: a string entry is a text leaf, a nested
 * array is read as its entries, null and other non-objects are skipped, a non-string type is dropped (the node is then read as inline),
 * a non-string text becomes a string and children that aren't an array are none.
 */
function cleanSlate(nodes: unknown): SlateNode[] {
  if (!Array.isArray(nodes)) return [];
  const out: SlateNode[] = [];
  for (const entry of nodes) {
    if (typeof entry === 'string') {
      out.push({ text: entry });
      continue;
    }
    if (Array.isArray(entry)) {
      out.push(...cleanSlate(entry));
      continue;
    }
    if (!isObject(entry)) continue;
    const node: SlateNode = { ...entry };
    if (typeof node.type !== 'string') delete node.type;
    if ('text' in entry) node.text = textField(entry.text);
    if (Array.isArray(entry.children)) node.children = cleanSlate(entry.children);
    // A string where the children should be is still text
    else if (typeof entry.children === 'string') node.children = [{ text: entry.children }];
    else delete node.children;
    out.push(node);
  }
  return out;
}

// The WordPress importer writes marks as wrapper elements: `{ type: 'strong', children }`.
const WRAPPER_MARKS: Record<string, string> = { strong: 'bold', b: 'bold', em: 'italic', i: 'italic', u: 'underline', s: 'strike', del: 'strike', code: 'code', kbd: 'kbd', span: '' };

const isSlateInline = (n: SlateNode) =>
  !n.type || n.type === 'text' || n.type === 'a' || n.type === 'mention' || hasOwn(WRAPPER_MARKS, n.type);

function inlineToTiptap(n: SlateNode, marks: Mark[]): TiptapJSONContent[] {
  if (n.type === 'mention') return typeof n.value === 'string' && n.value ? [{ type: 'mention', attrs: { id: n.value, label: null } }] : [];
  if (n.type === 'a') {
    const link = { type: 'link', attrs: { href: String(n.url ?? '') } };
    // The importers write `{ type: 'a', url, text }` with no children.
    const children = n.children?.length ? n.children : [{ text: String(n.text ?? n.url ?? '') }];
    return children.flatMap((c) => inlineToTiptap(c, [...marks, link]));
  }
  if (hasOwn(WRAPPER_MARKS, n.type)) {
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
const paragraph = (content: TiptapJSONContent[]): TiptapJSONContent => (content.length ? { type: 'paragraph', content } : { type: 'paragraph' });

/** Block children, with runs of inline children wrapped in paragraphs. */
function blocksToTiptap(children: SlateNode[] | undefined): TiptapJSONContent[] {
  const out: TiptapJSONContent[] = [];
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

function imageNode(n: SlateNode, caption: string | null = null): TiptapJSONContent {
  return n.type === 'local_image'
    ? { type: 'image', attrs: { fileKey: stringOr(n.fileKey, null), fileId: stringOr(n.fileId, null), ...(caption ? { caption } : {}) } }
    : { type: 'image', attrs: { src: String(n.url ?? n.src ?? ''), ...(caption ? { caption } : {}) } };
}

function listItemToTiptap(li: SlateNode): TiptapJSONContent {
  const content: TiptapJSONContent[] = [];
  for (const c of li.children ?? []) {
    if (c.type === 'lic') content.push(paragraph(inlines(c.children)));
    else if (c.type === 'ul' || c.type === 'ol') content.push(...blockToTiptap(c));
    else content.push(...blocksToTiptap([c]));
  }
  // A list item starts with a paragraph.
  if (content[0]?.type !== 'paragraph') content.unshift({ type: 'paragraph' });
  return { type: 'listItem', content };
}

function blockToTiptap(n: SlateNode): TiptapJSONContent[] {
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
      return [{ type: 'codeBlock', attrs: { language: stringOr(n.lang, '') || null }, ...(code ? { content: [{ type: 'text', text: code }] } : {}) }];
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

/** A Tiptap document for any stored Slate body (array, plain string or nothing). Never throws. */
export function slateToTiptap(body: string | SlateNode[] | undefined | null): TiptapJSONContent {
  const content =
    typeof body === 'string'
      ? body.split('\n').map((line) => paragraph(line ? [{ type: 'text', text: line }] : []))
      : Array.isArray(body)
        ? blocksToTiptap(cleanSlate(body))
        : [];
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

// ---- Tiptap JSON, cleaned ----

export type CleanTiptapOptions = {
  /** Node types to keep; any other node is replaced by its content. Default: every string type. */
  isKnownNode?: (type: string) => boolean;
  /** Mark types to keep; any other mark is dropped. Default: every string type. */
  isKnownMark?: (type: string) => boolean;
};

/**
 * A well-formed copy of a Tiptap document: only plain objects with a string type, `content` and
 * `marks` only when they are arrays, `attrs` only when it is an object, and `text` as a string.
 * A node of an unknown type is replaced by its (cleaned) content, so its text stays. The result is
 * always a `doc`; a root that isn't one becomes its only child.
 */
export function cleanTiptapDoc(doc: unknown, options: CleanTiptapOptions = {}): TiptapJSONContent {
  const knownNode = options.isKnownNode ?? (() => true);
  const knownMark = options.isKnownMark ?? (() => true);

  const marksOf = (marks: unknown[]) =>
    marks.flatMap((m) =>
      isObject(m) && typeof m.type === 'string' && knownMark(m.type)
        ? [{ type: m.type, ...(isObject(m.attrs) ? { attrs: m.attrs } : {}) }]
        : []
    );
  const nodes = (list: unknown): TiptapJSONContent[] => (Array.isArray(list) ? list.flatMap(node) : []);
  const node = (n: unknown): TiptapJSONContent[] => {
    if (!isObject(n) || typeof n.type !== 'string') return [];
    // A Journal note link the publish didn't rewrite: its label, as text, for every reader
    if (n.type === 'noteLink') {
      const label = isObject(n.attrs) ? textField(n.attrs.label) : '';
      return label ? [{ type: 'text', text: label }] : [];
    }
    if (!knownNode(n.type)) return nodes(n.content);
    const out: TiptapJSONContent = { type: n.type };
    if (isObject(n.attrs)) out.attrs = n.attrs;
    if ('text' in n) out.text = textField(n.text);
    if (Array.isArray(n.content)) out.content = nodes(n.content);
    if (Array.isArray(n.marks)) {
      const marks = marksOf(n.marks);
      if (marks.length) out.marks = marks;
    }
    return [out];
  };

  if (!isObject(doc)) return { type: 'doc', content: [] };
  if (doc.type === 'doc' || doc.type === undefined) return { type: 'doc', content: nodes(doc.content) };
  return { type: 'doc', content: node(doc) };
}

// ---- Tiptap -> Slate (the reduced copy) ----

const emptyLeaf = (): SlateNode[] => [{ text: '' }];
const nonEmpty = (children: SlateNode[]) => (children.length ? children : emptyLeaf());

function inlineToSlate(n: TiptapJSONContent, ctx: Ctx): SlateNode[] {
  switch (n.type) {
    case 'text': {
      const leaf: SlateNode = { text: n.text ?? '' };
      for (const m of n.marks ?? []) if (hasOwn(TIPTAP_MARKS, m.type)) leaf[TIPTAP_MARKS[m.type]] = true;
      const link = n.marks?.find((m) => m.type === 'link');
      return [link ? { type: 'a', url: stringOr(link.attrs?.href, ''), children: [leaf] } : leaf];
    }
    case 'hardBreak':
      return [{ text: '\n' }];
    case 'mention':
      return [{ type: 'mention', value: stringOr(n.attrs?.id, ''), children: emptyLeaf() }];
    case 'inlineMath':
      return [{ text: textField(n.attrs?.latex), code: true }];
    case 'footnoteReference':
      return [{ text: `[${ctx.footnoteNumber(n.attrs?.id)}]` }];
    case 'image':
      return []; // lifted out of the paragraph by `paragraphToSlate`
    default:
      return (n.content ?? []).flatMap((c) => inlineToSlate(c, ctx));
  }
}

const inlinesToSlate = (content: TiptapJSONContent[] | undefined, ctx: Ctx) => (content ?? []).flatMap((c) => inlineToSlate(c, ctx));

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

const textBlock = (type: string, content: TiptapJSONContent[] | undefined, ctx: Ctx): SlateNode => ({
  type,
  children: nonEmpty(mergeLeaves(inlinesToSlate(content, ctx))),
});

function imageToSlate(img: TiptapJSONContent): SlateNode[] {
  const attrs = img.attrs ?? {};
  const [fileKey, fileId, src, alt] = [attrs.fileKey, attrs.fileId, attrs.src, attrs.alt].map((v) => stringOr(v, undefined));
  const caption = attrs.caption === null ? null : stringOr(attrs.caption, undefined);
  const out: SlateNode[] = [];
  if (fileKey) out.push({ type: 'local_image', fileKey, ...(fileId ? { fileId } : {}), children: emptyLeaf() });
  else if (src && !src.startsWith('data:')) out.push({ type: 'p', children: [{ type: 'a', url: src, children: [{ text: alt || src }] }] });
  // null caption shows the alt text; "" hides it.
  const shown = caption ?? alt;
  if (shown) out.push({ type: 'p', children: [{ text: shown, italic: true }] });
  return out;
}

/** A paragraph's images become blocks of their own around its text. */
function paragraphToSlate(n: TiptapJSONContent, ctx: Ctx, type = 'p'): SlateNode[] {
  const images = (n.content ?? []).filter((c) => c.type === 'image');
  const rest = (n.content ?? []).filter((c) => c.type !== 'image');
  const out: SlateNode[] = [];
  if (rest.length || !images.length) out.push(textBlock(type, rest, ctx));
  for (const img of images) out.push(...imageToSlate(img));
  return out;
}

/** The text of a container's blocks, one line each, as one inline run. */
function flatInlines(blocks: TiptapJSONContent[] | undefined, ctx: Ctx): SlateNode[] {
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

function listToSlate(n: TiptapJSONContent, ctx: Ctx, type: 'ul' | 'ol', prefix?: (item: TiptapJSONContent) => string): SlateNode {
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

function blockToSlate(n: TiptapJSONContent, ctx: Ctx): SlateNode[] {
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
      const lang = n.type === 'blockMath' ? 'latex' : codeLanguage(n.attrs?.language);
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

const blocksToSlate = (blocks: TiptapJSONContent[] | undefined, ctx: Ctx) => (blocks ?? []).flatMap((b) => blockToSlate(b, ctx));

/** The reduced Slate copy of a Tiptap document, for old clients reading `body`. Never throws. */
export function tiptapToSlate(input: TiptapJSONContent): SlateNode[] {
  const doc = cleanTiptapDoc(input);
  // Footnotes are numbered by their order in the footnotes section.
  const ids = (doc.content ?? []).filter((b) => b.type === 'footnotes').flatMap((s) => (s.content ?? []).map((fn) => fn.attrs?.id));
  const ctx: Ctx = { footnoteNumber: (id) => ids.indexOf(id) + 1 || ids.length + 1 };
  const out = blocksToSlate(doc.content, ctx);
  return out.length ? out : [{ type: 'p', children: emptyLeaf() }];
}

/** Plain text of a Tiptap document, block by block: for reading time and the harness. Never throws. */
export function tiptapText(doc: TiptapJSONContent): string {
  return textOfDoc(cleanTiptapDoc(doc));
}

function textOfDoc(n: TiptapJSONContent): string {
  if (n.type === 'text') return n.text ?? '';
  if (n.type === 'hardBreak') return '\n';
  if (n.type === 'mention') return `@${n.attrs?.id ?? ''}`;
  if (n.type === 'inlineMath' || n.type === 'blockMath') return String(n.attrs?.latex ?? '');
  if (n.type === 'toggle') return [n.attrs?.summary, ...(n.content ?? []).map(textOfDoc)].filter(Boolean).join('\n');
  if (n.type === 'linkPreview') return String(n.attrs?.title || n.attrs?.url || '');
  if (n.type === 'image') {
    // On a line of its own: an image in a paragraph sits between words
    const caption = String(n.attrs?.caption ?? n.attrs?.alt ?? '');
    return caption && `\n${caption}\n`;
  }
  const inline = n.type === 'paragraph' || n.type === 'heading' || n.type === 'codeBlock';
  return (n.content ?? []).map(textOfDoc).join(inline ? '' : '\n');
}
