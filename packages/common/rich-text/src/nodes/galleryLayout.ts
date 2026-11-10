/**
 * Layouts of an image gallery (#601, #602; the row layout is described here), shared by the editor and the share page.
 * No React, so the headless schema and the share markdown pipeline can use it.
 *
 * The gallery is one wrapping flex row (src/index.css, "Image gallery"). Each image
 * grows by its aspect ratio (`--ar`, set once it loads), so a row's images share one
 * height. Rows end at zero-height break elements placed before an image: `wide` ones
 * apply above 480px, `narrow` ones at or below it.
 */

import { editedSize, parseEditData } from '../lib/imageEdits';

export const GALLERY_LAYOUTS = ['row', 'grid', 'masonry', 'carousel'] as const;
export type GalleryLayout = (typeof GALLERY_LAYOUTS)[number];

/** `value` if it names a layout, else `row`. */
export function toGalleryLayout(value: unknown): GalleryLayout {
  return GALLERY_LAYOUTS.find((layout) => layout === value) ?? 'row';
}

/** At most this many images per row above 480px; at or below it, two. */
const WIDE_PER_ROW = 3;
const NARROW_PER_ROW = 2;

export type RowBreakMode = 'wide' | 'narrow';

/**
 * Where rows break in a gallery of `count` images: the index of the image a new row
 * starts at, and the widths it applies to. Wide rows are balanced (4 is 2 + 2, 7 is
 * 3 + 2 + 2), so no row holds a lone image; narrow rows are pairs.
 */
export function galleryRowBreaks(count: number): Array<{ index: number; modes: RowBreakMode[] }> {
  const wide = new Set<number>();
  const rows = Math.ceil(count / WIDE_PER_ROW);
  const base = Math.floor(count / rows);
  let start = 0;
  for (let row = 0; row < rows - 1; row++) {
    start += base + (row < count % rows ? 1 : 0);
    wide.add(start);
  }
  const breaks: Array<{ index: number; modes: RowBreakMode[] }> = [];
  for (let index = 1; index < count; index++) {
    const modes: RowBreakMode[] = [];
    if (wide.has(index)) modes.push('wide');
    if (index % NARROW_PER_ROW === 0) modes.push('narrow');
    if (modes.length) breaks.push({ index, modes });
  }
  return breaks;
}

/**
 * Gives the gallery item holding `img` its aspect ratio, so it grows by it. The ratio
 * is that of the edited image (#607): the editor's image node and the share page's image
 * carry the crop, rotate and flip as data attributes around the img.
 */
function setItemAspect(img: HTMLImageElement): void {
  const gallery = img.closest('[data-gallery]');
  if (!gallery || !img.naturalWidth || !img.naturalHeight) return;
  let item: HTMLElement = img;
  while (item.parentElement && item.parentElement !== gallery) item = item.parentElement;
  const edits = parseEditData((name) => img.closest(`[${name}]`)?.getAttribute(name));
  const { width, height } = editedSize({ width: img.naturalWidth, height: img.naturalHeight }, edits);
  item.style.setProperty('--ar', String(width / height));
}

/**
 * Keeps the `--ar` of every gallery item under `root` in step with its image, which
 * may load (or be swapped for a larger one) at any time. Returns the cleanup.
 */
export function watchGalleryAspect(root: HTMLElement): () => void {
  // `load` doesn't bubble, so listen in the capture phase.
  const onLoad = (e: Event) => {
    if (e.target instanceof HTMLImageElement) setItemAspect(e.target);
  };
  root.addEventListener('load', onLoad, true);
  root.querySelectorAll<HTMLImageElement>('[data-gallery] img').forEach((img) => {
    if (img.complete) setItemAspect(img);
  });
  // Applying an edit changes the data attributes, not the image.
  const observer = new MutationObserver((mutations) => {
    for (const { target } of mutations) {
      if (!(target instanceof HTMLElement)) continue;
      const img = target.querySelector('img');
      if (img?.complete) setItemAspect(img);
    }
  });
  observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-crop', 'data-rotate', 'data-flip'] });
  return () => {
    root.removeEventListener('load', onLoad, true);
    observer.disconnect();
  };
}

/**
 * Previous / next buttons and dots for a carousel (#602), which is a scroll-snap row:
 * `scroller` does the scrolling and swiping, this only drives and mirrors it. Left and
 * right arrow keys on `keyTarget` page through it. Returns the nav element, for the
 * caller to place, and the cleanup.
 */
export function createCarouselNav(scroller: HTMLElement, keyTarget: HTMLElement): { nav: HTMLElement; destroy: () => void } {
  const nav = document.createElement('div');
  nav.className = 'gallery-nav';
  nav.contentEditable = 'false';
  const button = (label: string, text: string, onClick: () => void) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', label);
    el.textContent = text;
    el.addEventListener('click', onClick);
    return el;
  };
  const slides = () =>
    Array.from(scroller.children).filter((c) => !c.matches('.gallery-break, .ProseMirror-separator, .ProseMirror-trailingBreak'));
  const current = () => Math.max(0, Math.min(slides().length - 1, Math.round(scroller.scrollLeft / (scroller.clientWidth || 1))));
  const show = (index: number) => {
    const to = Math.max(0, Math.min(slides().length - 1, index));
    scroller.scrollTo?.({ left: to * scroller.clientWidth, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const prev = button('Previous image', '‹', () => show(current() - 1));
  const next = button('Next image', '›', () => show(current() + 1));
  const dots = document.createElement('div');
  dots.className = 'gallery-dots';
  nav.append(prev, dots, next);

  const refresh = () => {
    const count = slides().length;
    if (dots.children.length !== count) {
      dots.replaceChildren(...Array.from({ length: count }, (_, i) => button(`Show image ${i + 1} of ${count}`, '', () => show(i))));
    }
    const at = current();
    Array.from(dots.children).forEach((dot, i) => (i === at ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current')));
    prev.disabled = at === 0;
    next.disabled = at >= count - 1;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    show(current() + (e.key === 'ArrowRight' ? 1 : -1));
  };
  scroller.addEventListener('scroll', refresh, { passive: true });
  keyTarget.addEventListener('keydown', onKey);
  const observer = new MutationObserver(refresh);
  observer.observe(scroller, { childList: true });
  refresh();
  return {
    nav,
    destroy: () => {
      scroller.removeEventListener('scroll', refresh);
      keyTarget.removeEventListener('keydown', onKey);
      observer.disconnect();
    },
  };
}
