/**
 * js-lib's Slate <-> Tiptap converters, read with the feed's own richTextHelper: the code that
 * computes `readingTimeStats` and mention notifications from `body` today. The fixtures are
 * js-lib's (src/public/posts/ArticleBody/fixtures); every file there runs through these checks.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  slateToTiptap,
  tiptapText,
  tiptapToSlate,
  type SlateNode,
  type TiptapJSONContent,
} from '@homebase-id/js-lib/public';
import { findMentionedInRichText, getPlainTextFromRichText } from './richTextHelper';

const FIXTURES = join(__dirname, '../../../../libs/js-lib/src/public/posts/ArticleBody/fixtures');
const load = <T>(dir: string) =>
  readdirSync(join(FIXTURES, dir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, JSON.parse(readFileSync(join(FIXTURES, dir, f), 'utf8')) as T] as const);

const slateFixtures = load<SlateNode[]>('slate');
const tiptapFixtures = load<TiptapJSONContent>('tiptap');

/** Words, ignoring punctuation and `@`, for comparing text across formats. */
const words = (text: string | undefined) =>
  (text ?? '').toLowerCase().split(/[^\p{L}\p{N}.:/_-]+/u).map((w) => w.replace(/^[.:]+|[.:]+$/g, '')).filter(Boolean);

const types = (nodes: SlateNode[]): string[] => nodes.flatMap((n) => [...(n.type ? [n.type] : []), ...types(n.children ?? [])]);

describe.each(slateFixtures)('Slate body %s as a Tiptap document', (_name, body) => {
  const doc = slateToTiptap(body);

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

describe.each(tiptapFixtures)('Reduced Slate copy of %s', (_name, doc) => {
  const reduced = tiptapToSlate(doc);

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
});
