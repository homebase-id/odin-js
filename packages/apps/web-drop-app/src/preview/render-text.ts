import { h, notice, scrollable, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

export const MAX_TEXT_BYTES = 2 * 1024 * 1024;

/** Decodes at most 2 MB; a cut inside a multibyte character becomes a replacement char. */
export function decodeCapped(bytes: Uint8Array): { text: string; truncated: boolean } {
  const truncated = bytes.length > MAX_TEXT_BYTES;
  const text = new TextDecoder('utf-8').decode(truncated ? bytes.subarray(0, MAX_TEXT_BYTES) : bytes);
  return { text, truncated };
}

export const textBlock = (file: PreviewFile, text: string): HTMLElement => {
  const pre = scrollable(h('pre', 'preview-text', text), S.scrollRegion(file.name));
  pre.setAttribute('dir', 'auto');
  return pre;
};

export const withTruncationNote = (pre: HTMLElement, truncated: boolean): HTMLElement => {
  if (!truncated) return pre;
  const wrap = h('div', 'preview-text-wrap');
  wrap.appendChild(pre);
  wrap.appendChild(notice(S.truncated));
  return wrap;
};

// Source is shown as source - html, xml and markdown are never rendered, only read as text.
export function renderText(file: PreviewFile): HTMLElement {
  const { text, truncated } = decodeCapped(file.bytes);
  return withTruncationNote(textBlock(file, text), truncated);
}
