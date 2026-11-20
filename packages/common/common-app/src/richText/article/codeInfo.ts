/**
 * Live blocks: code blocks Journal renders as a live preview. A block's language comes from
 * `codeLanguage` (js-lib), which reads the first word of the fence's info string; which languages
 * are live, and how they run, is @2002bishwajeet/live-blocks'.
 */

/** Highlighting aliases: a `react` live block's code is JSX, which the javascript grammar reads. */
export const LANGUAGE_ALIASES = { javascript: ['react'] };
