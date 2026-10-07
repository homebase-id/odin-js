import { decodeCapped, textBlock, withTruncationNote } from './render-text';
import type { PreviewFile } from './dom';

export function prettyJson(text: string, truncated: boolean): string {
  if (truncated) return text; // a cut document will not parse
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function renderJson(file: PreviewFile): HTMLElement {
  const { text, truncated } = decodeCapped(file.bytes);
  return withTruncationNote(textBlock(file, prettyJson(text, truncated)), truncated);
}
