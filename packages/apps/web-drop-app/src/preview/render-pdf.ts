import { h, notice, type PreviewFile } from './dom';

const MAX_PAGES = 100;

// Pages are painted to canvas on purpose: the browser's own PDF viewer has download and print
// buttons. pdfjs is imported only when a PDF is present, so other drops never pay for it.
export function renderPdf(file: PreviewFile): HTMLElement {
  const host = h('div', 'preview-pdf');
  host.appendChild(notice('Loading PDF…'));
  host.addEventListener('contextmenu', (e) => e.preventDefault());

  void paintPdf(host, file).catch((e) => {
    console.warn('[webdrop] pdf render failed', e);
    host.replaceChildren(notice("This PDF can't be shown in this browser."));
  });
  return host;
}

async function paintPdf(host: HTMLElement, file: PreviewFile) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // pdfjs transfers the buffer to its worker, so hand it a copy and keep file.bytes intact.
  const task = pdfjs.getDocument({ data: file.bytes.slice() });
  const doc = await task.promise;
  host.replaceChildren();

  try {
    const pages = Math.min(doc.numPages, MAX_PAGES);
    for (let n = 1; n <= pages; n++) {
      // The open screen replaced the DOM (destruct or expiry): stop and free the document.
      if (host.isConnected === false) return;
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = h('canvas', 'preview-pdf-page');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      host.appendChild(canvas);
      await page.render({ canvas, viewport }).promise;
    }
    if (doc.numPages > MAX_PAGES) host.appendChild(notice(`Only the first ${MAX_PAGES} pages are shown.`));
  } finally {
    void task.destroy();
  }
}
