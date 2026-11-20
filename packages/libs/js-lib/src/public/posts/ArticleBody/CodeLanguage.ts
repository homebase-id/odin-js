/**
 * A code block's `language` attribute, as Journal writes it (src/lib/liveBlocks.ts there), is the
 * fence's whole info string, such as `html id=k3f9 wide`. The Slate copy and the feed's viewer
 * both read its language with `codeLanguage`.
 */

/**
 * The language: the info string's first word, lowercased and cut to characters that are safe in a
 * class name. The rest (`id=…`, `wide`) is Journal's and ignored here; '' when there is none.
 */
export function codeLanguage(info: unknown): string {
  const [first = ''] = (typeof info === 'string' ? info : '').trim().split(/\s+/);
  return first.toLowerCase().replace(/[^a-z0-9_+#.-]/g, '');
}
