import { h, notice, type PreviewFile } from './dom';
import { decodeCapped } from './render-text';

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

const isTsv = (file: PreviewFile) =>
  file.contentType.toLowerCase().includes('tab-separated') || file.name.toLowerCase().endsWith('.tsv');

export function renderTable(file: PreviewFile): HTMLElement {
  const { text, truncated } = decodeCapped(file.bytes);
  const { rows, more } = parseCsv(text, isTsv(file) ? '\t' : ',', MAX_TABLE_ROWS);

  const wrap = h('div', 'preview-table-wrap');
  const table = h('table', 'preview-table');
  const thead = h('thead');
  const tbody = h('tbody');
  rows.forEach((cells, index) => {
    const tr = h('tr');
    for (const cell of cells) tr.appendChild(h(index === 0 ? 'th' : 'td', undefined, cell));
    (index === 0 ? thead : tbody).appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  if (more) wrap.appendChild(notice(`Only the first ${MAX_TABLE_ROWS} rows are shown.`));
  else if (truncated) wrap.appendChild(notice('Truncated: only the first 2 MB are shown.'));
  return wrap;
}
