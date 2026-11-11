/**
 * The converter harness. Slate fixtures are bodies as the feed stores them; Tiptap
 * fixtures are documents Journal's editor writes. Drop more files into
 * fixtures/slate or fixtures/tiptap and every check below runs on them too.
 * The feed's own readers (common-app's richTextHelper) run on the same fixtures in
 * common-app/src/helpers/richTextHelper.slateTiptap.test.ts.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OLD_RENDERER_TYPES,
  slateToTiptap,
  tiptapText,
  tiptapToSlate,
  type SlateNode,
  type TiptapJSONContent,
} from './SlateTiptap';

const load = <T>(dir: string) =>
  readdirSync(join(__dirname, 'fixtures', dir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, JSON.parse(readFileSync(join(__dirname, 'fixtures', dir, f), 'utf8')) as T] as const);

const slateFixtures = load<SlateNode[]>('slate');
const tiptapFixtures = load<TiptapJSONContent>('tiptap');

// What each node may hold, after the article schema: `+` needs at least one, `*` allows none.
const INLINE = ['text', 'hardBreak', 'mention', 'image', 'inlineMath', 'footnoteReference'];
const BLOCK = [
  'paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'taskList', 'table',
  'gallery', 'callout', 'toggle', 'linkPreview', 'footnotes', 'blockMath', 'horizontalRule',
];
const CONTENT: Record<string, [string[], '+' | '*']> = {
  doc: [BLOCK, '+'],
  paragraph: [INLINE, '*'],
  heading: [INLINE, '*'],
  codeBlock: [['text'], '*'],
  blockquote: [BLOCK, '+'],
  bulletList: [['listItem'], '+'],
  orderedList: [['listItem'], '+'],
  listItem: [BLOCK, '+'],
  taskList: [['taskItem'], '+'],
  taskItem: [BLOCK, '+'],
  table: [['tableRow'], '+'],
  tableRow: [['tableCell', 'tableHeader'], '+'],
  tableCell: [BLOCK, '+'],
  tableHeader: [BLOCK, '+'],
  gallery: [['image'], '+'],
  callout: [BLOCK, '+'],
  toggle: [BLOCK, '+'],
  footnotes: [['footnote'], '+'],
  footnote: [['paragraph'], '+'],
};
const MARKS = ['bold', 'italic', 'underline', 'strike', 'code', 'kbd', 'link', 'subscript', 'superscript'];

/** What is wrong with a document's structure: unknown nodes or marks, misplaced or empty content. */
function problems(node: TiptapJSONContent, path = 'doc'): string[] {
  const out: string[] = [];
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return [`${path}: not a node`];
  const { type } = node;
  if (type === 'text') {
    if (typeof node.text !== 'string' || !node.text) out.push(`${path}: empty text`);
    if (node.content) out.push(`${path}: text with content`);
    for (const mark of node.marks ?? [])
      if (!MARKS.includes(mark?.type)) out.push(`${path}: unknown mark ${mark?.type}`);
    return out;
  }
  if (node.marks) out.push(`${path}: marks on ${type}`);
  if (node.content !== undefined && !Array.isArray(node.content)) return [...out, `${path}: content is not an array`];
  const rule = CONTENT[type];
  if (!rule) {
    if (!INLINE.includes(type) && !BLOCK.includes(type)) out.push(`${path}: unknown node ${type}`);
    else if (node.content?.length) out.push(`${path}: ${type} holds content`);
    return out;
  }
  const [allowed, count] = rule;
  const content = node.content ?? [];
  if (count === '+' && !content.length) out.push(`${path}: empty ${type}`);
  if (type === 'listItem' || type === 'taskItem')
    if (content[0]?.type !== 'paragraph') out.push(`${path}: ${type} does not start with a paragraph`);
  content.forEach((child, i) => {
    const at = `${path}/${type}[${i}]`;
    if (!allowed.includes(child?.type as string)) out.push(`${at}: ${child?.type} not allowed in ${type}`);
    if (type === 'codeBlock' && child?.marks) out.push(`${at}: marks in code`);
    out.push(...problems(child, at));
  });
  return out;
}

const expectValid = (doc: TiptapJSONContent) => {
  expect(doc.type).toBe('doc');
  expect(problems(doc)).toEqual([]);
};

const types = (nodes: SlateNode[]): string[] => nodes.flatMap((n) => [...(n.type ? [n.type] : []), ...types(n.children ?? [])]);

const stripIds = (nodes: SlateNode[]): SlateNode[] =>
  nodes.map((node) => {
    const n = { ...node };
    delete n.id;
    delete n.lastModified;
    return n.children ? { ...n, children: stripIds(n.children) } : n;
  });

describe('the structure check', () => {
  it.each(tiptapFixtures)('accepts %s', (_name, doc) => expectValid(doc));

  it('rejects what the schema would', () => {
    expect(problems({ type: 'doc', content: [] })).not.toEqual([]);
    expect(problems({ type: 'doc', content: [{ type: 'text', text: 'loose' }] })).not.toEqual([]);
    expect(problems({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] })).not.toEqual([]);
    expect(problems({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'paragraph' }] }] })).not.toEqual([]);
    expect(problems({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'paragraph' }] }] })).not.toEqual([]);
    expect(problems({ type: 'doc', content: [{ type: 'noteLink' }] })).not.toEqual([]);
  });
});

describe.each(slateFixtures)('Slate body %s', (_name, body) => {
  it('converts to a valid document', () => {
    expectValid(slateToTiptap(body));
  });
});

describe('Slate written by the current editor', () => {
  it.each(slateFixtures.filter(([name]) => name.startsWith('editor-')))('%s survives a round trip unchanged', (_name, body) => {
    // Plate's node ids and an image's lastModified are not content; nothing reads them back.
    expect(tiptapToSlate(slateToTiptap(body))).toEqual(stripIds(body));
  });
});

describe.each(tiptapFixtures)('Reduced Slate copy of %s', (_name, doc) => {
  const reduced = tiptapToSlate(doc);

  it('uses only types the old renderer knows', () => {
    expect(Array.isArray(reduced)).toBe(true);
    for (const type of types(reduced)) expect(OLD_RENDERER_TYPES).toContain(type);
  });

  it('converts back to a valid document', () => {
    expectValid(slateToTiptap(reduced));
  });

  it('is stable when read back and written again', () => {
    expect(tiptapToSlate(slateToTiptap(reduced))).toEqual(reduced);
  });
});

describe('plain-string bodies', () => {
  it('become paragraphs', () => {
    const doc = slateToTiptap('first line\nsecond line');
    expect(doc.content).toHaveLength(2);
    expectValid(doc);
    expect(tiptapText(doc)).toContain('second line');
  });

  it.each([undefined, null, '', []])('empty body %j gives an empty document', (body) => {
    expectValid(slateToTiptap(body as never));
  });
});

describe('malformed input never throws', () => {
  it.each([
    ['a null entry', [null]],
    ['a string entry', ['hello']],
    ['a number and a nested array', [42, [{ text: 'deep' }]]],
    ['children that are an object', [{ type: 'p', children: { text: 'x' } }]],
    ['children that are a string', [{ type: 'p', children: 'hello' }]],
    ['a non-string type', [{ type: 7, children: [{ text: 'hello' }] }]],
    ['an object type', [{ type: { name: 'p' }, text: 'hello' }]],
    ['a prototype key as type', [{ type: 'constructor', children: [{ text: 'hello' }] }, { type: 'toString', text: 'x' }]],
    ['a non-string text', [{ type: 'p', children: [{ text: 5 }, { text: { a: 1 } }, null] }]],
    ['null children of a list', [{ type: 'ul', children: [null, 'item', { type: 'li', children: null }] }]],
    ['a figure without children', [{ type: 'figure' }, { type: 'code_block', children: [null, { text: 1 }] }]],
  ])('slateToTiptap: %s', (_name, body) => {
    const doc = slateToTiptap(body as never);
    expectValid(doc);
    // The round trip back to the reduced copy is safe too
    expect(() => tiptapToSlate(doc)).not.toThrow();
  });

  it('keeps the text it can find', () => {
    const text = (body: unknown) => tiptapText(slateToTiptap(body as never));
    expect(text(['hello'])).toBe('hello');
    expect(text([42, [{ text: 'deep' }]])).toBe('deep');
    expect(text([null, { type: 'p', children: 'hello' }])).toBe('hello');
    expect(text([{ type: 7, children: [{ text: 'typed' }] }])).toBe('typed');
    expect(text([{ type: 'constructor', children: [{ text: 'proto' }] }])).toBe('proto');
    expect(text([{ type: 'p', children: [{ text: 5 }] }])).toBe('5');
    expect(text([{ type: 'p', children: { text: 'gone' } }])).toBe('');
  });

  it.each([
    ['null', null],
    ['a string', 'doc'],
    ['an array', [{ type: 'paragraph' }]],
    ['content that is an object', { type: 'doc', content: { type: 'paragraph' } }],
    ['null entries', { type: 'doc', content: [null, 'text', 3, { type: 'paragraph', content: [null, { type: 'text', text: 'kept' }] }] }],
    ['a non-string type', { type: 'doc', content: [{ type: 9, content: [] }, { content: [{ type: 'text', text: 'x' }] }] }],
    ['prototype keys as types', { type: 'doc', content: [{ type: 'constructor', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'kept', marks: [{ type: 'constructor' }, null, { type: 'valueOf' }] }] }] }] }],
    ['a non-string text', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: { a: 1 } }, { type: 'text', text: 2 }] }] }],
    ['marks and attrs of the wrong kind', { type: 'doc', content: [{ type: 'heading', attrs: 'big', content: [{ type: 'text', text: 'h', marks: { type: 'bold' } }] }] }],
    ['lists with broken items', { type: 'doc', content: [{ type: 'bulletList', content: [null, { type: 'listItem', content: 'x' }] }, { type: 'table', content: [{ type: 'tableRow', content: null }] }] }],
    ['images with odd attrs', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { fileKey: 3, src: { a: 1 }, alt: 4, caption: [] } }] }, { type: 'gallery', content: [null] }] }],
  ])('tiptapToSlate and tiptapText: %s', (_name, doc) => {
    expect(() => tiptapToSlate(doc as never)).not.toThrow();
    expect(() => tiptapText(doc as never)).not.toThrow();
    expect(Array.isArray(tiptapToSlate(doc as never))).toBe(true);
    for (const type of types(tiptapToSlate(doc as never))) expect(OLD_RENDERER_TYPES).toContain(type);
  });

  it('keeps the text of a malformed document', () => {
    const doc = {
      type: 'doc',
      content: [null, { type: 'constructor', content: [{ type: 'paragraph', content: [null, { type: 'text', text: 'kept' }, { type: 'text', text: 2 }] }] }],
    };
    expect(tiptapText(doc as never)).toBe('kept2');
    expect(JSON.stringify(tiptapToSlate(doc as never))).toContain('kept2');
  });
});
