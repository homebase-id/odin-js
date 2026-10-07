import { formatSize, h, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1) : '';
  return ext.length > 0 && ext.length <= 5 ? ext.toUpperCase() : '';
};

export function renderUnavailable(file: PreviewFile): HTMLElement {
  const box = h('div', 'preview-unavailable');
  const glyph = h('span', 'preview-unavailable-glyph', extensionOf(file.name));
  glyph.setAttribute('aria-hidden', 'true');
  glyph.setAttribute('dir', 'ltr');
  box.appendChild(glyph);
  box.appendChild(h('p', 'preview-unavailable-title', S.unavailableTitle));
  const name = h('p', 'preview-unavailable-file', `${file.name} · ${formatSize(file.bytes.length)}`);
  name.setAttribute('dir', 'auto');
  box.appendChild(name);
  box.appendChild(h('p', 'preview-note', S.unavailableBody));
  return box;
}
