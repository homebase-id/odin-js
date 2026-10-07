import { blockContextMenu, fallback, h, notice, type PreviewFile } from './dom';
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
  img.addEventListener('error', () => {
    if (maybe && isHeif(file)) void convertHeif(img, file);
    else img.replaceWith(fallback(maybe ? S.tiffFailed : S.imageFailed));
  });
  img.src = file.url;
  return img;
}

// Safari decodes HEIC natively; everywhere else libheif (as wasm) is fetched only on that failure,
// and paints straight to a canvas so no second object URL exists to leak past the destruct.
async function convertHeif(img: HTMLImageElement, file: PreviewFile) {
  const status = notice(S.heicConverting);
  status.setAttribute('role', 'status');
  status.classList.add('preview-converting');
  img.replaceWith(status);
  try {
    const { heicTo } = await import('heic-to/csp');
    const bitmap = await heicTo({ blob: new Blob([file.bytes as BlobPart]), type: 'bitmap' });
    const canvas = h('canvas', 'preview-image');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', file.name);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close();
    blockContextMenu(canvas);
    const figure = h('figure', 'preview-figure');
    figure.appendChild(canvas);
    const caption = h('figcaption', 'preview-note preview-converted', S.heicConverted);
    caption.setAttribute('dir', 'auto');
    figure.appendChild(caption);
    if (status.isConnected) status.replaceWith(figure);
  } catch (e) {
    console.warn('[webdrop] heic decode failed', e);
    if (status.isConnected) status.replaceWith(fallback(S.heicFailed));
  }
}
