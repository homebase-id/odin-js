import { h, metaPart, notice, scrollable, type PreviewFile, type PreviewSlots } from './dom';
import { decodeCapped } from './render-text';
import { PREVIEW_STRINGS as S } from './strings';

export const MAX_TABLE_ROWS = 1000;

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, embedded delimiters and newlines. */
export function parseCsv(text: string, delimiter: string, maxRows: number): { rows: string[][]; more: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endRow = () => {
    row.push(field);
    field = '';
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
      if (rows.length > maxRows) return { rows: rows.slice(0, maxRows), more: true };
    } else field += c;
  }
  if (field !== '' || row.length > 0) endRow();
  if (rows.length > maxRows) return { rows: rows.slice(0, maxRows), more: true };
  return { rows, more: false };
}

const NUMERIC = /^[-+]?[\d\s.,]+%?$/;
const WRAP_AFTER = 32;

// A column whose filled cells are all numbers aligns to the end, header included.
const numericColumns = (body: string[][]): Set<number> => {
  const cols = new Set<number>();
  const width = Math.max(0, ...body.map((r) => r.length));
  for (let c = 0; c < width; c++) {
    const filled = body.map((r) => r[c] ?? '').filter((v) => v.trim() !== '');
    if (filled.length > 0 && filled.every((v) => NUMERIC.test(v.trim()))) cols.add(c);
  }
  return cols;
};

const isTsv = (file: PreviewFile) =>
  file.contentType.toLowerCase().includes('tab-separated') || file.name.toLowerCase().endsWith('.tsv');

/** Keeps the end-edge fade and the scroll hint in step with whether more columns are off-screen. */
const trackOverflow = (scroller: HTMLElement, frame: HTMLElement, hint: HTMLElement | null) => {
  const update = () => {
    const room = scroller.scrollWidth - scroller.clientWidth;
    const atEnd = room - Math.abs(scroller.scrollLeft) <= 2; // scrollLeft runs negative in RTL
    frame.classList.toggle('more-end', room > 2 && !atEnd);
    frame.classList.toggle('more-start', Math.abs(scroller.scrollLeft) > 2);
    if (hint) hint.hidden = room <= 2;
  };
  scroller.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(scroller);
};

export function renderTable(file: PreviewFile, slots?: PreviewSlots): HTMLElement {
  const { text, truncated } = decodeCapped(file.bytes);
  const { rows, more } = parseCsv(text, isTsv(file) ? '\t' : ',', MAX_TABLE_ROWS);
  const columns = Math.max(0, ...rows.map((r) => r.length));

  const wrap = h('div', 'preview-table-block');
  const frame = h('div', 'preview-table-frame');
  const scroller = scrollable(h('div', 'preview-table-wrap'), S.scrollRegion(file.name));
  const table = h('table', 'preview-table');
  const thead = h('thead');
  const tbody = h('tbody');
  const numeric = numericColumns(rows.slice(1));
  rows.forEach((cells, index) => {
    const tr = h('tr');
    cells.forEach((cell, c) => {
      // Short cells (dates, codes) stay on one line; only long prose wraps.
      const cls = numeric.has(c) ? 'num' : index > 0 && cell.length > WRAP_AFTER ? 'long' : undefined;
      const node = h(index === 0 ? 'th' : 'td', cls, cell);
      node.setAttribute('dir', 'auto');
      if (index === 0) node.setAttribute('scope', 'col');
      tr.appendChild(node);
    });
    (index === 0 ? thead : tbody).appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  scroller.appendChild(table);
  frame.appendChild(scroller);
  wrap.appendChild(frame);
  if (more) wrap.appendChild(notice(S.tableCapped(MAX_TABLE_ROWS)));
  else if (truncated) wrap.appendChild(notice(S.truncated));

  let hint: HTMLElement | null = null;
  if (slots) {
    slots.meta.appendChild(metaPart(S.tableColumns(columns)));
    hint = metaPart(S.tableScrollHint, 'preview-meta-part preview-scroll-hint');
    hint.hidden = true;
    slots.meta.appendChild(hint);
  }
  if (typeof scroller.classList !== 'undefined') trackOverflow(scroller, frame, hint);
  return wrap;
}
