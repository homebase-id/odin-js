import type { Token, Tokens } from 'marked';
import { codeBlock } from './code';
import { blockContextMenu, h, notice, scrollable, toolButton, type PreviewFile, type PreviewSlots } from './dom';
import { decodeCapped, withTruncationNote } from './render-text';
import { PREVIEW_STRINGS as S } from './strings';

const SAFE_HREF = /^(https?:|mailto:)/i;
const BARE_TAG = /^<\/?[A-Za-z][^>]*>$/;

// Built from marked's token stream with DOM calls and textContent only: raw HTML in the file is
// never parsed, so there is no sanitiser to get wrong.
function inline(tokens: Token[] | undefined, parent: HTMLElement) {
  for (const t of tokens ?? []) {
    switch (t.type) {
      case 'strong':
      case 'em':
      case 'del': {
        const node = h(t.type === 'strong' ? 'strong' : t.type === 'em' ? 'em' : 'del');
        inline((t as Tokens.Strong).tokens, node);
        parent.appendChild(node);
        break;
      }
      case 'codespan':
        parent.appendChild(h('code', 'md-chip', (t as Tokens.Codespan).text));
        break;
      case 'br':
        parent.appendChild(h('br'));
        break;
      case 'link': {
        const link = t as Tokens.Link;
        if (SAFE_HREF.test(link.href)) {
          const a = h('a', 'md-link');
          a.href = link.href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer nofollow';
          inline(link.tokens, a);
          parent.appendChild(a);
        } else inline(link.tokens, parent);
        break;
      }
      case 'image': // never fetched: a remote image would tell its host who opened the drop
        parent.appendChild(h('span', 'md-image-alt', (t as Tokens.Image).text));
        break;
      case 'html':
        if (!BARE_TAG.test(t.raw.trim())) parent.appendChild(h('span', undefined, t.raw));
        break;
      case 'checkbox':
        parent.appendChild(h('span', 'md-check', (t as Tokens.Checkbox).checked ? '☑ ' : '☐ '));
        break;
      default:
        if ('tokens' in t && t.tokens) inline(t.tokens, parent);
        else parent.appendChild(h('span', undefined, 'text' in t ? String(t.text) : t.raw));
    }
  }
}

function blocks(tokens: Token[], parent: HTMLElement) {
  for (const t of tokens) {
    switch (t.type) {
      case 'space':
      case 'def':
        break;
      case 'heading': {
        const level = Math.min(6, (t as Tokens.Heading).depth + 2) as 3 | 4 | 5 | 6;
        const node = h(`h${level}`, `md-h md-h${(t as Tokens.Heading).depth}`);
        inline((t as Tokens.Heading).tokens, node);
        parent.appendChild(node);
        break;
      }
      case 'paragraph': {
        const p = h('p');
        inline((t as Tokens.Paragraph).tokens, p);
        parent.appendChild(p);
        break;
      }
      case 'text': {
        const span = h('span');
        inline((t as Tokens.Text).tokens ?? [{ type: 'text', raw: t.raw, text: (t as Tokens.Text).text } as Token], span);
        parent.appendChild(span);
        break;
      }
      case 'blockquote': {
        const q = h('blockquote');
        blocks((t as Tokens.Blockquote).tokens, q);
        parent.appendChild(q);
        break;
      }
      case 'list': {
        const list = t as Tokens.List;
        const node = h(list.ordered ? 'ol' : 'ul');
        if (list.ordered && typeof list.start === 'number' && list.start !== 1) node.setAttribute('start', String(list.start));
        for (const item of list.items) {
          const li = h('li', item.task ? 'md-task' : undefined);
          blocks(item.tokens, li);
          node.appendChild(li);
        }
        parent.appendChild(node);
        break;
      }
      case 'code': {
        const pre = h('pre', 'md-code', (t as Tokens.Code).text);
        pre.setAttribute('dir', 'ltr');
        parent.appendChild(pre);
        break;
      }
      case 'hr':
        parent.appendChild(h('hr'));
        break;
      case 'table': {
        const table = t as Tokens.Table;
        const scroller = h('div', 'md-table-wrap');
        const node = h('table', 'preview-table');
        const head = h('tr');
        for (const cell of table.header) {
          const th = h('th');
          inline(cell.tokens, th);
          head.appendChild(th);
        }
        const thead = h('thead');
        thead.appendChild(head);
        node.appendChild(thead);
        const tbody = h('tbody');
        for (const row of table.rows) {
          const tr = h('tr');
          for (const cell of row) {
            const td = h('td');
            inline(cell.tokens, td);
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        node.appendChild(tbody);
        scroller.appendChild(node);
        parent.appendChild(scroller);
        break;
      }
      default: // block html and anything newer than this viewer: shown as its source
        parent.appendChild(h('pre', 'md-code', t.raw));
    }
  }
}

export function renderMarkdown(file: PreviewFile, slots?: PreviewSlots): HTMLElement {
  const { text, truncated } = decodeCapped(file.bytes);
  const frame = h('div', 'preview-md-frame');
  const formatted = scrollable(h('div', 'preview-md'), S.scrollRegion(file.name));
  formatted.setAttribute('dir', 'auto');
  formatted.setAttribute('aria-busy', 'true');
  formatted.appendChild(notice(S.markdownLoading));
  blockContextMenu(formatted);
  const source = codeBlock(file, text, 'source');
  source.hidden = true;
  frame.appendChild(formatted);
  frame.appendChild(source);

  if (slots) {
    const group = h('div', 'preview-segmented');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', S.markdownView);
    const showFormatted = toolButton(S.markdownFormatted);
    const showSource = toolButton(S.markdownSource);
    const select = (src: boolean) => {
      source.hidden = !src;
      formatted.hidden = src;
      showFormatted.setAttribute('aria-pressed', String(!src));
      showSource.setAttribute('aria-pressed', String(src));
    };
    showFormatted.addEventListener('click', () => select(false));
    showSource.addEventListener('click', () => select(true));
    select(false);
    group.appendChild(showFormatted);
    group.appendChild(showSource);
    slots.tools.appendChild(group);
  }

  void import('marked')
    .then(({ marked }) => {
      formatted.replaceChildren();
      blocks(marked.lexer(text, { gfm: true }), formatted);
    })
    .catch((e) => {
      console.warn('[webdrop] markdown render failed', e);
      formatted.replaceChildren(h('pre', 'md-code', text));
    })
    .finally(() => formatted.removeAttribute('aria-busy'));

  return withTruncationNote(frame, truncated);
}
