/** Text compared loosely: one case, single spaces, no trailing punctuation or ellipsis. */
const loose = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\s.,;:!?…]+$/u, '');

/**
 * The text of a Slate node and everything under it. A block of blocks (a list, its items) has its
 * children's text joined with spaces, so "Apples", "Pears" stay two words; a paragraph's text and
 * inlines join as they are.
 */
const textOf = (node: unknown): string => {
  if (!node || typeof node !== 'object') return '';
  const { text, children } = node as { text?: unknown; children?: unknown };
  if (typeof text === 'string') return text;
  if (!Array.isArray(children)) return '';
  const ofBlocks = children.every(
    (child) => child && typeof child === 'object' && Array.isArray(child.children)
  );
  return children.map(textOf).join(ofBlocks ? ' ' : '');
};

/** The body's opening text: its first block that has any, or a plain body's text. */
export const openingText = (body: string | Record<string, unknown>[] | undefined): string => {
  if (typeof body === 'string') return body;
  for (const block of body ?? []) {
    const text = textOf(block);
    if (text.trim()) return text;
  }
  return '';
};

/** Blocks an excerpt leaves out: headings, code and quotes read wrong out of place */
const NOT_IN_EXCERPT = /^(h\d|code_block|blockquote)$/;

/**
 * The body's first paragraphs as one line of plain text, headings, code and quotes left out, about
 * `max` characters.
 */
export const openingExcerpt = (
  body: string | Record<string, unknown>[] | undefined,
  max = 300
): string => {
  const blocks =
    typeof body === 'string'
      ? [body]
      : (body ?? []).filter((block) => !NOT_IN_EXCERPT.test(String(block.type ?? ''))).map(textOf);
  let excerpt = '';
  for (const block of blocks) {
    excerpt = `${excerpt} ${block.replace(/\s+/g, ' ').trim()}`.trim();
    if (excerpt.length >= max) break;
  }
  return excerpt.slice(0, max);
};

/**
 * The abstract to show under an article's title, or undefined when there is none or it only
 * repeats the opening of the body (an article published without a summary of its own gets its first
 * paragraph, or the start of it, as its abstract).
 */
export const abstractSubtitle = (
  abstract: string | undefined,
  body: string | Record<string, unknown>[] | undefined
): string | undefined => {
  const subtitle = loose(abstract ?? '');
  if (!subtitle) return undefined;
  const opening = loose(openingText(body));
  return opening.startsWith(subtitle) ? undefined : abstract;
};
