/**
 * The converter harness. Slate fixtures are bodies as the feed stores them; Tiptap
 * fixtures are documents the next editor writes. Drop more files into
 * fixtures/slate or fixtures/tiptap and every check below runs on them too.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSchema, type JSONContent } from '@tiptap/core';
import { createBaseExtensions, OLD_RENDERER_TYPES, slateToTiptap, tiptapText, tiptapToSlate, type SlateNode } from '../index';
// The helpers the feed runs on `body` today: mentions and plain text.
import { findMentionedInRichText, getPlainTextFromRichText } from '../../common-app/src/helpers/richTextHelper';

const schema = getSchema(createBaseExtensions());

const load = <T>(dir: string) =>
  readdirSync(join(__dirname, 'fixtures', dir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, JSON.parse(readFileSync(join(__dirname, 'fixtures', dir, f), 'utf8')) as T] as const);

const slateFixtures = load<SlateNode[]>('slate');
const tiptapFixtures = load<JSONContent>('tiptap');

/** Words, ignoring punctuation and `@`, for comparing text across formats. */
const words = (text: string | undefined) =>
  (text ?? '').toLowerCase().split(/[^\p{L}\p{N}.:/_-]+/u).map((w) => w.replace(/^[.:]+|[.:]+$/g, '')).filter(Boolean);

const types = (nodes: SlateNode[]): string[] => nodes.flatMap((n) => [...(n.type ? [n.type] : []), ...types(n.children ?? [])]);

const stripIds = (nodes: SlateNode[]): SlateNode[] =>
  nodes.map((node) => {
    const n = { ...node };
    delete n.id;
    delete n.lastModified;
    return n.children ? { ...n, children: stripIds(n.children) } : n;
  });

describe.each(slateFixtures)('Slate body %s', (_name, body) => {
  const doc = slateToTiptap(body);

  it('converts to a valid document', () => {
    expect(() => schema.nodeFromJSON(doc).check()).not.toThrow();
  });

  it('keeps every word', () => {
    // The new document may hold more: the old helper skips a link button's text.
    const kept = new Set(words(tiptapText(doc)));
    expect(words(getPlainTextFromRichText(body)).filter((w) => !kept.has(w))).toEqual([]);
  });

  it('keeps mentions and images', () => {
    const json = JSON.stringify(doc);
    for (const odinId of findMentionedInRichText(body)) expect(json).toContain(`"id":"${odinId}"`);
    for (const fileKey of JSON.stringify(body).match(/pst_rtei\d+/g) ?? []) expect(json).toContain(fileKey);
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

  it('keeps every word', () => {
    const old = new Set(words(getPlainTextFromRichText(reduced)));
    expect(words(tiptapText(doc)).filter((w) => !old.has(w))).toEqual([]);
  });

  it('keeps mentions and image payloads', () => {
    const json = JSON.stringify(doc);
    const ids = [...json.matchAll(/"type":"mention","attrs":\{"id":"([^"]+)"/g)].map((m) => m[1]);
    expect(findMentionedInRichText(reduced).sort()).toEqual(ids.sort());
    const keys = [...new Set(json.match(/pst_rtei\d+/g) ?? [])];
    expect(types(reduced).filter((t) => t === 'local_image')).toHaveLength(keys.length);
  });

  it('is stable when read back and written again', () => {
    expect(tiptapToSlate(slateToTiptap(reduced))).toEqual(reduced);
  });
});

describe('plain-string bodies', () => {
  it('become paragraphs', () => {
    const doc = slateToTiptap('first line\nsecond line');
    expect(doc.content).toHaveLength(2);
    expect(() => schema.nodeFromJSON(doc).check()).not.toThrow();
  });

  it.each([undefined, null, '', []])('empty body %j gives an empty document', (body) => {
    expect(() => schema.nodeFromJSON(slateToTiptap(body as never)).check()).not.toThrow();
  });
});

describe('malformed input never throws', () => {
  const valid = (doc: JSONContent) => expect(() => schema.nodeFromJSON(doc).check()).not.toThrow();

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
    valid(doc);
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
    expect(getPlainTextFromRichText(tiptapToSlate(doc as never))).toContain('kept2');
  });
});
