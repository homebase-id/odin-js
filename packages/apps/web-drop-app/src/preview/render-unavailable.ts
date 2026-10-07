import { extensionTag, h, notice, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

// The card header already carries the name and size; the body only says why there is no preview.
export function renderUnavailable(file: PreviewFile): HTMLElement {
  const box = h('div', 'preview-unavailable');
  box.setAttribute('role', 'status');
  const glyph = h('span', 'preview-unavailable-glyph', extensionTag(file.name, 5));
  glyph.setAttribute('aria-hidden', 'true');
  glyph.setAttribute('dir', 'ltr');
  box.appendChild(glyph);
  const title = h('p', 'preview-unavailable-title', S.unavailableTitle);
  title.setAttribute('dir', 'auto');
  box.appendChild(title);
  box.appendChild(notice(S.unavailableBody));
  return box;
}
