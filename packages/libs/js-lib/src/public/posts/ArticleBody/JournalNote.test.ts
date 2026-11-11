/**
 * Notes published from Journal. `fixtures/tiptap/journal-note.json` is a document from Journal's
 * own schema (its createBaseExtensions, markdown import, then `nodeFromJSON(...).toJSON()`), with
 * every node, mark and attr its editor writes, including noteLink and live blocks whose `language`
 * is a whole fence info string.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tiptapText, tiptapToSlate, type TiptapJSONContent } from './SlateTiptap';
import { articleDocOf, toStoredArticleBody } from './StoredArticleBody';

const doc = JSON.parse(readFileSync(join(__dirname, 'fixtures/tiptap/journal-note.json'), 'utf8')) as TiptapJSONContent;

describe('a Journal note', () => {
  it('keeps its note links as their labels in the Slate copy and the text', () => {
    const slate = JSON.stringify(tiptapToSlate(doc));
    expect(slate).toContain('Another note');
    expect(slate).toContain('Wiki title');
    expect(slate).not.toContain('journal:');
    expect(tiptapText(doc)).toContain('a note link Another note plus Wiki title.');
  });

  it('round-trips through storage unchanged', async () => {
    const stored = await toStoredArticleBody(doc);
    expect(await articleDocOf(stored)).toBe(doc);
  });
});
