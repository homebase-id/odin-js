/**
 * Heading ids of the article viewer (the `id` on h1-h6, which the table of contents links to).
 * This is the reference rule; odin-core ports it to C#, so change both together.
 *
 * 1. The heading's text: the text of every text node under it, in document order, joined with
 *    nothing, then trimmed (String.prototype.trim: Unicode whitespace). Mentions, math, footnote
 *    references and hard breaks add nothing. `indexDoc` in ArticleDocRenderer does this step.
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
