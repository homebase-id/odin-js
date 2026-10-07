import { h, swapWithFallback, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

// An <img> keeps SVG script-inert; the image is never inlined into the DOM.
export function renderImage(file: PreviewFile, maybe: boolean): HTMLElement {
  const img = h('img', 'preview-image');
  img.alt = file.name;
  img.draggable = false;
  img.addEventListener('contextmenu', (e) => e.preventDefault());
  img.addEventListener('error', () => swapWithFallback(img, maybe ? S.heicFailed : S.imageFailed));
  img.src = file.url;
  return img;
}
