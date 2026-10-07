import { classify, type PreviewClass } from './classify';
import { extensionTag, formatSize, h, metaPart, type PreviewFile, type PreviewSlots } from './dom';
import { renderImage } from './render-image';
import { renderJson } from './render-json';
import { renderMarkdown } from './render-markdown';
import { renderAudio, renderVideo } from './render-media';
import { renderPdf } from './render-pdf';
import { renderTable } from './render-table';
import { renderText } from './render-text';
import { renderUnavailable } from './render-unavailable';
import { PREVIEW_STRINGS as S } from './strings';

const isMarkdown = (file: PreviewFile) =>
  /^text\/markdown\b/i.test(file.contentType) || /\.(md|markdown)$/i.test(file.name);

export function renderPreviewBody(
  file: PreviewFile,
  slots?: PreviewSlots,
  kind: PreviewClass = classify(file.contentType, file.name)
): HTMLElement {
  switch (kind) {
    case 'image':
      return renderImage(file, false);
    case 'image-maybe':
      return renderImage(file, true);
    case 'video':
      return renderVideo(file);
    case 'audio':
      return renderAudio(file);
    case 'pdf':
      return renderPdf(file, slots);
    case 'text':
      return isMarkdown(file) ? renderMarkdown(file, slots) : renderText(file);
    case 'json':
      return renderJson(file);
    case 'table':
      return renderTable(file, slots);
    default:
      return renderUnavailable(file);
  }
}

/** "JPG image", "DOCX file": the extension the recipient recognises, not a raw mime string. */
export function kindLabel(file: PreviewFile, kind: PreviewClass): string {
  const tag = extensionTag(file.name, 6);
  return tag ? `${tag} ${S.kind[kind]}` : S.kind[kind].replace(/^./, (c) => c.toUpperCase());
}

/** Two lines at most; a clamped name becomes a toggle that shows the rest. */
function fileName(file: PreviewFile): HTMLElement {
  const name = h('p', 'preview-name');
  name.setAttribute('title', file.name);
  name.appendChild(h('bdi', undefined, file.name));
  if (typeof ResizeObserver === 'undefined') return name;

  const toggle = () => {
    const open = name.classList.toggle('expanded');
    name.setAttribute('aria-expanded', String(open));
  };
  const ro = new ResizeObserver(() => {
    if (name.classList.contains('expanded') || name.scrollHeight <= name.clientHeight + 1) return;
    ro.disconnect();
    name.tabIndex = 0;
    name.setAttribute('role', 'button');
    name.setAttribute('aria-expanded', 'false');
    name.setAttribute('aria-description', S.expandName);
    name.addEventListener('click', toggle);
    name.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
  ro.observe(name);
  return name;
}

/** One inline preview per file. Nothing in here offers a download. */
export function renderPreviewList(files: PreviewFile[]): HTMLElement {
  const list = h('ul', 'previews');
  for (const file of files) {
    const kind = classify(file.contentType, file.name);
    const item = h('li', `preview kind-${kind}`);
    const head = h('div', 'preview-head');
    head.appendChild(fileName(file));
    const meta = h('p', 'preview-meta');
    meta.setAttribute('title', file.contentType);
    meta.appendChild(metaPart(kindLabel(file, kind)));
    meta.appendChild(metaPart(formatSize(file.bytes.length)));
    head.appendChild(meta);
    item.appendChild(head);

    const tools = h('div', 'preview-tools');
    const body = renderPreviewBody(file, { meta, tools }, kind);
    if (tools.children.length > 0) item.appendChild(tools);
    item.appendChild(body);
    list.appendChild(item);
  }
  return list;
}
