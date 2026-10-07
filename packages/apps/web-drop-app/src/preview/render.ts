import { classify, type PreviewClass } from './classify';
import { formatSize, h, type PreviewFile } from './dom';
import { renderImage } from './render-image';
import { renderJson } from './render-json';
import { renderAudio, renderVideo } from './render-media';
import { renderPdf } from './render-pdf';
import { renderTable } from './render-table';
import { renderText } from './render-text';
import { renderUnavailable } from './render-unavailable';
import { PREVIEW_STRINGS as S } from './strings';

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

const SOURCE_MIMES = /^(text\/(markdown|html)|application\/(xhtml\+)?xml|text\/xml)/;

/** "JPG image", "DOCX file": the extension the recipient recognises, not a raw mime string. */
export function kindLabel(file: PreviewFile, kind: PreviewClass): string {
  const dot = file.name.lastIndexOf('.');
  const ext = dot > 0 ? file.name.slice(dot + 1) : '';
  const tag = ext && ext.length <= 6 ? ext.toUpperCase() : '';
  return tag ? `${tag} ${S.kind[kind]}` : S.kind[kind].replace(/^./, (c) => c.toUpperCase());
}

/** One inline preview per file. Nothing in here offers a download. */
export function renderPreviewList(files: PreviewFile[]): HTMLElement {
  const list = h('ul', 'previews');
  for (const file of files) {
    const kind = classify(file.contentType, file.name);
    const item = h('li', 'preview');
    const caption = h('div', 'preview-caption');
    const name = h('span', 'preview-name', file.name);
    name.setAttribute('dir', 'auto');
    caption.appendChild(name);
    const meta = h('span', 'preview-meta', `${kindLabel(file, kind)} · ${formatSize(file.bytes.length)}`);
    meta.setAttribute('title', file.contentType);
    caption.appendChild(meta);
    item.appendChild(caption);

    item.appendChild(renderPreviewBody(file));

    if (kind === 'text' && SOURCE_MIMES.test(file.contentType.toLowerCase())) {
      item.appendChild(h('p', 'preview-note', S.shownAsSource));
    }
    list.appendChild(item);
  }
  return list;
}
