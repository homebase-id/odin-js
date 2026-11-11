/**
 * Live blocks: code blocks Journal renders as a live preview. A block's language comes from
 * `codeLanguage` (js-lib), which reads the first word of the fence's info string.
 */

/** Code-block languages Journal renders as a live preview: a diagram, a drawing or a framed page. */
export type LiveBlockKind = 'mermaid' | 'svg' | 'html' | 'react';

/** Highlighting aliases: a `react` live block's code is JSX, which the javascript grammar reads. */
export const LANGUAGE_ALIASES = { javascript: ['react'] };

/**
 * The live-preview kind for a code block's language (from `codeLanguage`), or null for an ordinary
 * code block. `jsx` and `tsx` stay ordinary code, as in Journal.
 */
export function liveBlockKind(language: string): LiveBlockKind | null {
  return language === 'mermaid' || language === 'svg' || language === 'html' || language === 'react'
    ? language
    : null;
}

/** SVG source as an `<img>`-safe data URI. Loaded as an image, its scripts never run. */
export function svgDataUri(source: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}
