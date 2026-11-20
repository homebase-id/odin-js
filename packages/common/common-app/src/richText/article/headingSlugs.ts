import type { JSONContent } from '@tiptap/core';

/**
 * Heading ids of the article viewer (the `id` on h1-h6, which the table of contents links to).
 * This is the reference rule; odin-core ports it to C#, so change both together.
 *
 * 1. The heading's text: the text of every text node under it, in document order, joined with
 *    nothing, then trimmed (String.prototype.trim: Unicode whitespace). Mentions, math, footnote
 *    references and hard breaks add nothing. `articleHeadings` below does this step.
 * 2. Lowercase (String.prototype.toLowerCase: the Unicode default case mapping, no locale).
 * 3. Normalize to NFKD.
 * 4. Strip diacritics: remove the combining marks U+0300 to U+036F.
 * 5. Keep letters and numbers (\p{L} and \p{N}, matched per code point, not per UTF-16 unit);
 *    every run of anything else becomes one '-'.
 * 6. Trim '-' from both ends.
 * 7. If nothing is left, use 'section'.
 *
 * Then `uniqueHeadingIds` de-duplicates, over every heading of the document depth first in document
 * order (headings inside toggles, callouts, lists and tables count): a repeated slug gets -2, -3, ...
 */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';

/**
 * Unique ids for heading slugs in document order: the first use of a slug keeps it; a later one
 * gets `slug-2`, `slug-3`, ..., the first such id not already taken by any earlier heading.
 */
export const uniqueHeadingIds = (slugs: string[]): string[] => {
  const used = new Set<string>();
  return slugs.map((base) => {
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  });
};

export type ArticleHeading = { node: JSONContent; id: string; level: number; text: string };

/** The text of every text node under `node`, in document order, joined with nothing (step 1). */
const textOf = (node: JSONContent): string =>
  node.type === 'text' ? (node.text ?? '') : (node.content ?? []).map(textOf).join('');

/** A table of contents (the viewer's box, the reader's rail) shows from this many headings on. */
export const MIN_TOC_HEADINGS = 3;

/**
 * Every heading of a cleaned document (`cleanTiptapDoc`), depth first in document order, with the
 * id the article viewer gives it. The viewer calls it on its sanitized document; the reader's rail
 * reads the headings off the rendered page.
 */
export const articleHeadings = (doc: JSONContent): ArticleHeading[] => {
  const found: Omit<ArticleHeading, 'id'>[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === 'heading') {
      const text = textOf(node).trim();
      found.push({ node, text, level: Math.min(6, Math.max(1, Number(node.attrs?.level) || 1)) });
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  const ids = uniqueHeadingIds(found.map((heading) => slugify(heading.text)));
  return found.map((heading, i) => ({ ...heading, id: ids[i] }));
};
