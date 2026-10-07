import { blockContextMenu, fallback, h, metaPart, notice, toolButton, type PreviewFile, type PreviewSlots } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

const MAX_PAGES = 100;
const ZOOMS = [1, 1.25, 1.5, 2, 3];
// Caps one page's bitmap so a 300% zoom on a wide screen cannot eat hundreds of megabytes.
const MAX_BITMAP_WIDTH = 3000;

type Fit = 'width' | 'page';

// Pages are painted to canvas on purpose: the browser's own PDF viewer has download and print
// buttons. pdfjs is imported only when a PDF is present, so other drops never pay for it.
export function renderPdf(file: PreviewFile, slots?: PreviewSlots): HTMLElement {
  const host = h('div', 'preview-pdf');
  host.setAttribute('aria-busy', 'true');
  host.appendChild(notice(S.pdfLoading));
  blockContextMenu(host);

  const ui = slots ? toolbar(host, slots) : null;
  void paintPdf(host, file, slots, ui).catch((e) => {
    console.warn('[webdrop] pdf render failed', e);
    host.removeAttribute('aria-busy');
    host.replaceChildren(fallback(S.pdfFailed));
    slots?.tools.replaceChildren();
  });
  return host;
}

interface Toolbar {
  chip: HTMLElement;
  onChange?: () => void;
}

function toolbar(host: HTMLElement, slots: PreviewSlots): Toolbar {
  slots.tools.classList.add('preview-tools-sticky');
  slots.tools.setAttribute('role', 'toolbar');
  slots.tools.setAttribute('aria-label', S.pdfToolbar);

  const chip = h('span', 'preview-chip');
  chip.setAttribute('aria-live', 'polite');
  chip.hidden = true;

  const zoomOut = toolButton('−', S.pdfZoomOut);
  const level = h('span', 'preview-zoom-level', S.zoomPercent(1));
  const zoomIn = toolButton('+', S.pdfZoomIn);
  const zoom = h('div', 'preview-segmented');
  zoom.append(zoomOut, level, zoomIn);

  const fitWidth = toolButton(S.pdfFitWidth, S.pdfFitWidthLabel);
  const fitPage = toolButton(S.pdfFitPage, S.pdfFitPageLabel);
  const fit = h('div', 'preview-segmented');
  fit.append(fitWidth, fitPage);

  // Wide screens open on a whole page; phones on the page width, where text is still readable.
  let mode: Fit = window.matchMedia('(min-width: 48rem)').matches ? 'page' : 'width';
  let step = 0;
  const ui: Toolbar = { chip };
  const apply = () => {
    host.classList.toggle('fit-page', mode === 'page');
    host.style.setProperty('--zoom', String(ZOOMS[step]));
    host.classList.toggle('zoomed', step > 0);
    level.textContent = S.zoomPercent(ZOOMS[step]);
    zoomOut.disabled = step === 0;
    zoomIn.disabled = step === ZOOMS.length - 1;
    fitWidth.setAttribute('aria-pressed', String(mode === 'width'));
    fitPage.setAttribute('aria-pressed', String(mode === 'page'));
    ui.onChange?.();
  };
  zoomOut.addEventListener('click', () => { step = Math.max(0, step - 1); apply(); });
  zoomIn.addEventListener('click', () => { step = Math.min(ZOOMS.length - 1, step + 1); apply(); });
  fitWidth.addEventListener('click', () => { mode = 'width'; step = 0; apply(); });
  fitPage.addEventListener('click', () => { mode = 'page'; step = 0; apply(); });
  apply();

  const spacer = h('span', 'preview-tools-spacer');
  slots.tools.append(chip, spacer, zoom, fit);
  return ui;
}

/** The chip follows whichever page crosses the upper third of the viewport. */
function pageFollower(chip: HTMLElement, total: number): (page: HTMLElement) => void {
  chip.hidden = false;
  chip.textContent = S.pdfPage(1, total);
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const pages: Element[] = [];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) chip.textContent = S.pdfPage(pages.indexOf(e.target) + 1, total);
    },
    { rootMargin: '-30% 0px -65% 0px' }
  );
  return (page) => {
    pages.push(page);
    io.observe(page);
  };
}

async function paintPdf(host: HTMLElement, file: PreviewFile, slots: PreviewSlots | undefined, ui: Toolbar | null) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // pdfjs transfers the buffer to its worker, so hand it a copy and keep file.bytes intact.
  const task = pdfjs.getDocument({ data: file.bytes.slice() });
  const doc = await task.promise;
  host.replaceChildren();
  slots?.meta.appendChild(metaPart(S.pdfPages(doc.numPages)));

  const count = Math.min(doc.numPages, MAX_PAGES);
  const scroller = h('div', 'preview-pdf-pages');
  host.appendChild(scroller);
  const follow = ui ? pageFollower(ui.chip, doc.numPages) : () => {};
  const dpr = window.devicePixelRatio || 1;

  let closed = false;
  // The open screen replaced the DOM (destruct or expiry): stop and free the document.
  const alive = () => {
    if (!closed && !host.isConnected) {
      closed = true;
      void task.destroy();
    }
    return !closed;
  };
  const reaper = setInterval(() => alive() || clearInterval(reaper), 5000);

  // Each page is painted at the pixel width it is shown at, so it is sharp at every zoom and never
  // downscaled into aliasing; repaints run one at a time because a canvas takes one render at once.
  let queue = Promise.resolve();
  const paint = (canvas: HTMLCanvasElement, n: number) =>
    (queue = queue.then(async () => {
      if (!alive()) return;
      const target = Math.min(MAX_BITMAP_WIDTH, Math.round(canvas.clientWidth * dpr));
      if (target <= 0 || Math.abs(target - canvas.width) / target < 0.1) return;
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: target / page.getViewport({ scale: 1 }).width });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, viewport }).promise;
    }));

  const canvases: HTMLCanvasElement[] = [];
  try {
    for (let n = 1; n <= count; n++) {
      if (!alive()) return;
      const base = (await doc.getPage(n)).getViewport({ scale: 1 });
      const canvas = h('canvas', 'preview-pdf-page');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', S.pdfPageLabel(file.name, n, doc.numPages));
      canvas.width = Math.floor(base.width);
      canvas.height = Math.floor(base.height);
      canvas.style.setProperty('--ratio', String(base.width / base.height));
      scroller.appendChild(canvas);
      canvases.push(canvas);
      follow(canvas);
      await paint(canvas, n);
    }
    if (doc.numPages > MAX_PAGES) host.appendChild(notice(S.pdfCapped(MAX_PAGES)));
  } finally {
    host.removeAttribute('aria-busy');
  }
  const repaintAll = () => canvases.forEach((c, i) => void paint(c, i + 1));
  if (ui) ui.onChange = repaintAll;
  new ResizeObserver(repaintAll).observe(host); // rotation, window resize
}
