import { classify } from './classify';
import { formatSize, h, type PreviewFile } from './dom';
import { renderImage } from './render-image';
import { renderJson } from './render-json';
import { renderAudio, renderVideo } from './render-media';
import { renderPdf } from './render-pdf';
import { renderTable } from './render-table';
import { renderText } from './render-text';
import { renderUnavailable } from './render-unavailable';

export function renderPreviewBody(file: PreviewFile): HTMLElement {
  switch (classify(file.contentType, file.name)) {
    case 'image':
      return renderImage(file, false);
    case 'image-maybe':
      return renderImage(file, true);
    case 'video':
      return renderVideo(file);
    case 'audio':
      return renderAudio(file);
    case 'pdf':
      return renderPdf(file);
    case 'text':
      return renderText(file);
    case 'json':
      return renderJson(file);
    case 'table':
      return renderTable(file);
    default:
      return renderUnavailable(file);
  }
}

/** One inline preview per file. Nothing in here offers a download. */
export function renderPreviewList(files: PreviewFile[]): HTMLElement {
  const list = h('ul', 'previews');
  for (const file of files) {
    const item = h('li', 'preview');
    const caption = h('div', 'preview-caption');
    caption.appendChild(h('span', 'preview-name', file.name));
    caption.appendChild(h('span', 'payload-type', `${file.contentType} · ${formatSize(file.bytes.length)}`));
    item.appendChild(caption);
    item.appendChild(renderPreviewBody(file));
    list.appendChild(item);
  }
  return list;
}
