import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDomStub, walk } from './preview-dom-stub.mjs';

installDomStub();
const { renderPreviewList, renderPreviewBody } = await import('./_build/app/preview/render.mjs');
const { parseCsv } = await import('./_build/app/preview/render-table.mjs');
const { openScreenHtml } = await import('./_build/app/screens/open.mjs');

const enc = new TextEncoder();
const file = (name, contentType, text) => ({ name, contentType, bytes: enc.encode(text), url: `blob:${name}` });
const HOSTILE = '<img src=x onerror=alert(1)>';

const assertNoDownload = (root) => {
  for (const el of walk(root)) assert.equal(el.hasAttribute('download'), false, `download on ${el.tagName}`);
};

test('the view-only preview list has no element with a download attribute and no anchors', () => {
  const list = renderPreviewList([
    file('a.png', 'image/png', ''),
    file('b.mp4', 'video/mp4', ''),
    file('c.mp3', 'audio/mpeg', ''),
    file('d.txt', 'text/plain', 'hi'),
    file('e.json', 'application/json', '{"a":1}'),
    file('f.csv', 'text/csv', 'a,b\n1,2'),
    file('g.zip', 'application/zip', 'PK'),
  ]);
  assertNoDownload(list);
  assert.equal(walk(list).some((e) => e.tagName === 'A'), false);
});

test('the view-only open screen markup carries no download attribute; the normal one still does', () => {
  const files = [{ name: 'a.txt', contentType: 'text/plain', url: 'blob:a' }];
  const viewOnly = openScreenHtml(files, true, 0);
  assert.equal(/\bdownload\b/i.test(viewOnly), false);
  assert.match(viewOnly, /View only: downloading is discouraged, not prevented/);
  assert.match(openScreenHtml(files, false, 0), /download="a.txt"/);
});

test('text, json and csv put hostile content in textContent, never innerHTML', () => {
  // The stub throws if innerHTML is ever assigned, so reaching the asserts proves it was not.
  const text = renderPreviewBody(file('t.txt', 'text/plain', HOSTILE));
  assert.equal(text.textContent, HOSTILE);
  assert.equal(walk(text).some((e) => e.tagName === 'IMG'), false);

  const html = renderPreviewBody(file('t.html', 'text/html', HOSTILE));
  assert.equal(html.textContent, HOSTILE);

  const json = renderPreviewBody(file('t.json', 'application/json', JSON.stringify({ k: HOSTILE })));
  assert.ok(json.textContent.includes(HOSTILE));
  assert.equal(walk(json).some((e) => e.tagName === 'IMG'), false);

  const badJson = renderPreviewBody(file('t.json', 'application/json', HOSTILE));
  assert.equal(badJson.textContent, HOSTILE);

  const csv = renderPreviewBody(file('t.csv', 'text/csv', `h1,h2\n${HOSTILE},"${HOSTILE}"`));
  assert.ok(walk(csv).some((e) => e.tagName === 'TD' && e.textContent === HOSTILE));
  assert.equal(walk(csv).some((e) => e.tagName === 'IMG'), false);
});

test('json is pretty-printed', () => {
  const json = renderPreviewBody(file('a.json', 'application/json', '{"a":[1,2]}'));
  assert.equal(json.textContent, JSON.stringify({ a: [1, 2] }, null, 2));
});

test('unpreviewable files get the not-available card under their name and size, not a link', () => {
  const card = renderPreviewBody(file('x.zip', 'application/zip', 'PK'));
  assert.match(card.textContent, /Preview not available/);
  assertNoDownload(card);
  const item = renderPreviewList([file('x.zip', 'application/zip', 'PK')]);
  assert.match(item.textContent, /x\.zip/);
  assert.match(item.textContent, /2 B/);
});

test('markdown renders as plain text through the code view, never as html', () => {
  const md = renderPreviewBody(file('n.md', 'text/markdown', `# Notes\n\n**key** [x](javascript:alert(1))\n\n${HOSTILE}\n`));
  const nodes = walk(md);
  assert.equal(nodes.some((e) => ['STRONG', 'A', 'IMG', 'H1'].includes(e.tagName)), false);
  assert.ok(md.textContent.includes('**key**'));
  assert.ok(md.textContent.includes(HOSTILE));
});

test('oversized text is capped at 2 MB with a note', () => {
  const big = { name: 'big.txt', contentType: 'text/plain', bytes: new Uint8Array(2 * 1024 * 1024 + 10).fill(97), url: 'blob:b' };
  const out = renderPreviewBody(big);
  assert.match(out.textContent, /Truncated/);
  assert.equal(out.children[0].textContent.length, 2 * 1024 * 1024);
});

test('csv parser: quotes, doubled quotes, embedded newlines, row cap', () => {
  assert.deepEqual(parseCsv('a,"b,c","d""e"\n1,"x\ny",3\r\n', ',', 10).rows, [
    ['a', 'b,c', 'd"e'],
    ['1', 'x\ny', '3'],
  ]);
  const many = Array.from({ length: 1500 }, (_, i) => `r${i}`).join('\n');
  const capped = parseCsv(many, ',', 1000);
  assert.equal(capped.rows.length, 1000);
  assert.equal(capped.more, true);
  assert.equal(parseCsv('a\tb', '\t', 10).rows[0][1], 'b');
});

test('media elements opt out of download affordances', () => {
  const video = renderPreviewBody(file('v.mp4', 'video/mp4', ''));
  assert.equal(video.attributes.controlsList, 'nodownload noremoteplayback');
  const img = renderPreviewBody(file('i.png', 'image/png', ''));
  assert.equal(img.attributes.draggable, 'false');
  assert.ok(img.listeners.contextmenu?.length);
});
