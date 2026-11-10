import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import type { Article } from '@homebase-id/js-lib/public';
import { articleDocOf, readingTimeOf, slateToTiptap, toStoredArticleBody } from '../index';
import allBlocks from './fixtures/tiptap/all-blocks.json';

const doc = allBlocks as JSONContent;

describe('stored article body', () => {
  it('hashes JSON.stringify(body) as lowercase hex SHA-256', async () => {
    const accented: JSONContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Café 日本 🎉' }] }] };
    const { body, bodyDoc } = await toStoredArticleBody(accented);
    expect(bodyDoc.format).toBe('tiptap-v1');
    expect(bodyDoc.slateHash).toBe(createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex'));
  });

  it('round-trips through storage', async () => {
    // Typed as js-lib's Article fields, so the two stay in step
    const stored: Pick<Article, 'body' | 'bodyDoc'> = await toStoredArticleBody(doc);
    // As a reader gets it back: JSON in the header or the text payload
    const read = JSON.parse(JSON.stringify(stored));
    expect(await articleDocOf(read)).toEqual(doc);
  });

  it('reads body when an old client edited it', async () => {
    const stored = await toStoredArticleBody(doc);
    const body = [{ type: 'p', children: [{ text: 'Edited on an old client' }] }];
    expect(await articleDocOf({ ...stored, body })).toEqual(slateToTiptap(body));
  });

  it('reads body when the format is unknown', async () => {
    const stored = await toStoredArticleBody(doc);
    const bodyDoc = { ...stored.bodyDoc, format: 'tiptap-v2' };
    expect(await articleDocOf({ body: stored.body, bodyDoc })).toEqual(slateToTiptap(stored.body));
  });

  it('reads body when there is no bodyDoc', async () => {
    expect(await articleDocOf({ body: 'plain text' })).toEqual(slateToTiptap('plain text'));
  });

  it('counts reading time from the document', () => {
    const words = Array.from({ length: 401 }, (_, i) => `w${i}`).join(' ');
    const short: JSONContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: words }] }] };
    expect(readingTimeOf(short)).toEqual({ words: 401, minutes: 3 });
  });
});
