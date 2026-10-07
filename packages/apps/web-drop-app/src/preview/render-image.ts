import { blockContextMenu, h, swapWithFallback, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

const HEIF = /^image\/hei[cf]/;
const isHeif = (file: PreviewFile) =>
  HEIF.test(file.contentType.toLowerCase()) || /\.hei[cf]$/i.test(file.name);

// An <img> keeps SVG script-inert; the image is never inlined into the DOM.
export function renderImage(file: PreviewFile, maybe: boolean): HTMLElement {
  const img = h('img', 'preview-image');
  img.alt = file.name;
  img.draggable = false;
  blockContextMenu(img);
  img.addEventListener('error', () =>
    swapWithFallback(img, !maybe ? S.imageFailed : isHeif(file) ? S.heicFailed : S.tiffFailed)
  );
  img.src = file.url;
  return img;
}
