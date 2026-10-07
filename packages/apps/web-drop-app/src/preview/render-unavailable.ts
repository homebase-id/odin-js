import { formatSize, h, type PreviewFile } from './dom';

export function renderUnavailable(file: PreviewFile): HTMLElement {
  const box = h('div', 'preview-unavailable');
  box.appendChild(h('p', 'preview-unavailable-title', 'Preview not available'));
  box.appendChild(h('p', 'preview-unavailable-file', `${file.name} · ${formatSize(file.bytes.length)}`));
  box.appendChild(
    h('p', 'preview-note', "This file type can't be previewed in a browser. View-only drops don't offer downloads.")
  );
  return box;
}
