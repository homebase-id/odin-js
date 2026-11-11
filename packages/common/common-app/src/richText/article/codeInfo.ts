/**
 * A code block's `language` attribute, as Journal writes it (src/lib/liveBlocks.ts there): the
 * fence's whole info string, so `html id=k3f9 wide` keeps the block's id and width with it.
 */

/** Code-block languages Journal renders as a live preview: a diagram, a drawing or a framed page. */
export type LiveBlockKind = 'mermaid' | 'svg' | 'html' | 'react';

const BLOCK_ID_TOKEN = /^id=[a-z0-9]{4,12}$/;

/**
 * The info string split: the language is the first word, the id an `id=<4–12 of a-z0-9>` word,
 * and `wide` a word of its own.
 */
export function parseCodeInfo(info: unknown): {
  language: string | null;
  id: string | null;
  wide: boolean;
} {
  const [language, ...rest] = (typeof info === 'string' ? info : '').trim().split(/\s+/);
  const token = rest.find((word) => BLOCK_ID_TOKEN.test(word));
  return {
    language: language || null,
    id: token ? token.slice('id='.length) : null,
    wide: rest.includes('wide'),
  };
}

/**
 * The live-preview kind for a code block's info string, or null for an ordinary code block. `jsx`
 * and `tsx` stay ordinary code, as in Journal.
 */
export function liveBlockKind(info: unknown): LiveBlockKind | null {
  const lang = parseCodeInfo(info).language?.toLowerCase();
  return lang === 'mermaid' || lang === 'svg' || lang === 'html' || lang === 'react' ? lang : null;
}

/** SVG source as an `<img>`-safe data URI. Loaded as an image, its scripts never run. */
export function svgDataUri(source: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}
