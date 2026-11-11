/**
 * Layouts of an image gallery, as Journal lays them out (its #601, #602; the row layout is
 * described here).
 *
 * The gallery is one wrapping flex row (Journal's src/index.css, "Image gallery"). Each image
 * grows by its aspect ratio (`--ar`, set once it loads), so a row's images share one
 * height. Rows end at zero-height break elements placed before an image: `wide` ones
 * apply above 480px, `narrow` ones at or below it.
 */

import { editedSize, parseEditData } from './imageEdits';

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
 * is that of the edited image (Journal's #607): the viewer, like Journal, writes the crop, rotate
 * and flip as data attributes around the img.
 */
function setItemAspect(img: HTMLImageElement): void {
  const gallery = img.closest('[data-gallery]');
  if (!gallery || !img.naturalWidth || !img.naturalHeight) return;
  let item: HTMLElement = img;
  while (item.parentElement && item.parentElement !== gallery) item = item.parentElement;
  const edits = parseEditData((name) => img.closest(`[${name}]`)?.getAttribute(name));
  const { width, height } = editedSize(
    { width: img.naturalWidth, height: img.naturalHeight },
    edits
  );
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
  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-crop', 'data-rotate', 'data-flip'],
  });
  return () => {
    root.removeEventListener('load', onLoad, true);
    observer.disconnect();
  };
}

/** The carousel slide `scroller` shows. */
export const slideIndex = (scroller: HTMLElement, count: number) =>
  Math.max(0, Math.min(count - 1, Math.round(scroller.scrollLeft / (scroller.clientWidth || 1))));

/** Scrolls a carousel to slide `index` of `count`, clamped; no animation under reduced motion. */
export function scrollToSlide(scroller: HTMLElement, index: number, count: number) {
  const to = Math.max(0, Math.min(count - 1, index));
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollTo?.({ left: to * scroller.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
}
