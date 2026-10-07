import { h, scrollable, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

type Token = 'plain' | 'key' | 'str' | 'num' | 'com' | 'prop';
type Segment = [Token, string];

interface Grammar {
  line?: string;
  block?: [string, string];
  backtick?: boolean;
  tags?: boolean;
}

const C_LIKE: Grammar = { line: '//', block: ['/*', '*/'] };
const GRAMMARS: Record<string, Grammar> = {
  kt: C_LIKE, kts: C_LIKE, java: C_LIKE, swift: C_LIKE, go: { ...C_LIKE, backtick: true }, rs: C_LIKE,
  c: C_LIKE, h: C_LIKE, cpp: C_LIKE, hpp: C_LIKE, cs: C_LIKE, dart: C_LIKE, groovy: C_LIKE, gradle: C_LIKE,
  php: C_LIKE, scss: C_LIKE, less: C_LIKE, proto: C_LIKE, css: { block: ['/*', '*/'] },
  js: { ...C_LIKE, backtick: true }, mjs: { ...C_LIKE, backtick: true }, jsx: { ...C_LIKE, backtick: true },
  ts: { ...C_LIKE, backtick: true }, tsx: { ...C_LIKE, backtick: true },
  py: { line: '#' }, sh: { line: '#', backtick: true }, bash: { line: '#' }, zsh: { line: '#' }, rb: { line: '#' },
  yaml: { line: '#' }, yml: { line: '#' }, toml: { line: '#' }, r: { line: '#' }, pl: { line: '#' },
  graphql: { line: '#' }, conf: { line: '#' }, ini: { line: ';' }, properties: { line: '#' }, env: { line: '#' },
  sql: { line: '--', block: ['/*', '*/'] }, lua: { line: '--' },
  html: { block: ['<!--', '-->'], tags: true }, htm: { block: ['<!--', '-->'], tags: true },
  xml: { block: ['<!--', '-->'], tags: true }, xhtml: { block: ['<!--', '-->'], tags: true },
  plist: { block: ['<!--', '-->'], tags: true }, svg: { block: ['<!--', '-->'], tags: true },
};

const KEYWORDS = new Set(
  (
    'package import from export as fun fn func function def val var let const return if else elif when switch case ' +
    'default for while do repeat in is not and or try catch except finally throw throws raise class object ' +
    'interface enum struct trait impl data sealed abstract open override private public protected internal ' +
    'static final suspend async await yield break continue new this self super null nil None true false True ' +
    'False void typeof instanceof extends implements where match mut pub use mod type with lambda pass ' +
    'guard defer go chan select echo then fi done esac local SELECT FROM WHERE INSERT UPDATE DELETE INTO ' +
    'VALUES CREATE TABLE JOIN ON AND OR NOT NULL AS ORDER BY GROUP LIMIT'
  ).split(' ')
);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

export const grammarFor = (file: PreviewFile): Grammar | null => GRAMMARS[extensionOf(file.name)] ?? null;

function tokenize(text: string, g: Grammar): Segment[] {
  const parts: string[] = [];
  if (g.block) parts.push(`${esc(g.block[0])}[\\s\\S]*?(?:${esc(g.block[1])}|$)`);
  if (g.line) parts.push(`${esc(g.line)}[^\\n]*`);
  parts.push(`"(?:\\\\.|[^"\\\\\\n])*"?`, `'(?:\\\\.|[^'\\\\\\n])*'?`);
  if (g.backtick) parts.push('`(?:\\\\.|[^`\\\\])*`?');
  if (g.tags) parts.push('</?[A-Za-z][\\w:.-]*', '/?>');
  parts.push('\\b(?:0[xX][\\da-fA-F_]+|\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)[a-zA-Z]*\\b', '[A-Za-z_][\\w]*');
  const re = new RegExp(parts.map((p) => `(${p})`).join('|'), 'g');

  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const s = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(['plain', text.slice(last, at)]);
    last = at + s.length;
    let kind: Token = 'plain';
    if ((g.block && s.startsWith(g.block[0])) || (g.line && s.startsWith(g.line))) kind = 'com';
    else if (s[0] === '"' || s[0] === "'" || s[0] === '`') kind = 'str';
    else if (s[0] === '<' || s.endsWith('>')) kind = 'key';
    else if (/^\d/.test(s)) kind = 'num';
    else if (KEYWORDS.has(s)) kind = 'key';
    out.push([kind, s]);
  }
  if (last < text.length) out.push(['plain', text.slice(last)]);
  return out;
}

const JSON_RE = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function tokenizeJson(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(JSON_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(['plain', text.slice(last, at)]);
    if (m[1]) {
      out.push([m[2] ? 'prop' : 'str', m[1]]);
      if (m[2]) out.push(['plain', m[2]]);
    } else out.push([m[3] ? 'num' : 'key', m[0]]);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(['plain', text.slice(last)]);
  return out;
}

// Past these sizes the per-line DOM costs more than the gutter is worth: plain wrapped text instead.
const MAX_GUTTER_LINES = 5000;
const MAX_GUTTER_CHARS = 512 * 1024;

const indentWidth = (line: string) => {
  let cols = 0;
  for (const c of line) {
    if (c === ' ') cols++;
    else if (c === '\t') cols += 4 - (cols % 4);
    else break;
  }
  return Math.min(cols, 40);
};

/**
 * Source with a line-number gutter; long lines wrap with a hanging indent under their own
 * indentation. Every character stays in textContent, so copy and the tests see the original text.
 */
export function codeBlock(file: PreviewFile, text: string, mode: 'json' | 'code' | 'source'): HTMLElement {
  const pre = scrollable(h('pre', 'preview-text'), S.scrollRegion(file.name));
  pre.setAttribute('dir', 'ltr');
  if (text.length > MAX_GUTTER_CHARS) {
    pre.textContent = text;
    return pre;
  }
  const lines = text.split('\n');
  if (lines.length > MAX_GUTTER_LINES) {
    pre.textContent = text;
    return pre;
  }

  const g = mode === 'code' ? grammarFor(file) : null;
  const segments: Segment[] = mode === 'json' ? tokenizeJson(text) : g ? tokenize(text, g) : [['plain', text]];

  pre.className = 'preview-text preview-code';
  pre.setAttribute('style', `--gutter: ${String(lines.length).length + 2}ch`);

  let line = h('span', 'ln');
  let lineText = '';
  const flush = (last: boolean) => {
    if (last && lineText === '' && pre.children.length > 0) return; // a final newline is not a line
    const indent = indentWidth(lineText);
    if (indent > 0) line.setAttribute('style', `--indent: ${indent}ch`);
    pre.appendChild(line);
    if (!last) {
      line = h('span', 'ln');
      lineText = '';
    }
  };
  const put = (kind: Token, s: string) => {
    if (!s) return;
    lineText += s;
    line.appendChild(kind === 'plain' ? h('span', undefined, s) : h('span', `tok-${kind}`, s));
  };

  for (const [kind, s] of segments) {
    const pieces = s.split('\n');
    pieces.forEach((piece, i) => {
      if (i > 0) {
        // The newline stays inside the line so textContent and copy keep the original text.
        put('plain', '\n');
        flush(false);
      }
      put(kind, piece);
    });
  }
  flush(true);
  return pre;
}
