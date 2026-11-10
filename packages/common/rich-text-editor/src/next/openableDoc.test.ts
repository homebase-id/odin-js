import { expect, test, vi } from 'vitest';
import { slateHash } from '@homebase-id/rich-text/src/stored';
import { EMPTY_DOC, openableDoc } from './openableDoc';

// Node views pull in browser-only code (window at import time); the schema doesn't use them
vi.mock('./nodes/ImageNodeView', () => ({ ImageNodeView: () => null }));
vi.mock('./nodes/LinkPreviewNodeView', () => ({ LinkPreviewNodeView: () => null }));

const body = [{ type: 'p', children: [{ text: 'hello' }] }];

test('opens a Slate body converted, and an empty body as an empty document', async () => {
  const doc = await openableDoc({ body });
  expect(JSON.stringify(doc)).toContain('hello');
  expect(await openableDoc({ body: [] })).toEqual(EMPTY_DOC);
  expect(await openableDoc({})).toEqual(EMPTY_DOC);
});

test('opens a stored bodyDoc that fits the schema', async () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'from doc' }] }] };
  const opened = await openableDoc({ body, bodyDoc: { format: 'tiptap-v1', doc, slateHash: await slateHash(body) } });
  expect(opened).toEqual(doc);
});

test('rejects a stored bodyDoc that does not fit the schema, which Tiptap would open empty', async () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'paragraph' }] }] };
  await expect(
    openableDoc({ body, bodyDoc: { format: 'tiptap-v1', doc, slateHash: await slateHash(body) } })
  ).rejects.toThrow();
  const unknownNode = { type: 'doc', content: [{ type: 'noSuchNode' }] };
  await expect(
    openableDoc({ body, bodyDoc: { format: 'tiptap-v1', doc: unknownNode, slateHash: await slateHash(body) } })
  ).rejects.toThrow();
});

test('rejects when the article cannot be read at all', async () => {
  // JSON.stringify throws on a BigInt, so hashing the body fails
  await expect(
    openableDoc({ body: [{ text: 1n }], bodyDoc: { format: 'tiptap-v1', doc: {}, slateHash: '' } })
  ).rejects.toThrow();
});
