import { h, swapWithNotice, type PreviewFile } from './dom';

const HEIC_MESSAGE = "This photo format can't be shown in this browser. Try Safari on iPhone, iPad or Mac.";

// An <img> keeps SVG script-inert; the image is never inlined into the DOM.
export function renderImage(file: PreviewFile, maybe: boolean): HTMLElement {
  const img = h('img', 'preview-image');
  img.alt = file.name;
  img.draggable = false;
  img.addEventListener('contextmenu', (e) => e.preventDefault());
  img.addEventListener('error', () =>
    swapWithNotice(img, maybe ? HEIC_MESSAGE : "This image can't be shown in this browser.")
  );
  img.src = file.url;
  return img;
}
