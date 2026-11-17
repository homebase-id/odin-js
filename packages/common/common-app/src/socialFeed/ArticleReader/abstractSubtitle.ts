/** Text compared loosely: one case, single spaces, no trailing punctuation or ellipsis. */
const loose = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\s.,;:!?…]+$/u, '');

/** The text of a Slate node and everything under it. */
const textOf = (node: unknown): string => {
  if (!node || typeof node !== 'object') return '';
  const { text, children } = node as { text?: unknown; children?: unknown };
  if (typeof text === 'string') return text;
  return Array.isArray(children) ? children.map(textOf).join('') : '';
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

/** The body's first paragraphs as one line of plain text, headings left out, about `max` characters. */
export const openingExcerpt = (
  body: string | Record<string, unknown>[] | undefined,
  max = 300
): string => {
  const blocks =
    typeof body === 'string'
      ? [body]
      : (body ?? []).filter((block) => !/^h\d$/.test(String(block.type ?? ''))).map(textOf);
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
