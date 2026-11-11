import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JSONContent } from '@tiptap/core';
import allBlocks from '../../../../../libs/js-lib/src/public/posts/ArticleBody/fixtures/tiptap/all-blocks.json';
import { ArticleDocRenderer, sanitizeArticleDoc, type ArticleDocOptions } from './ArticleDocRenderer';
import { slugify, uniqueHeadingIds } from './headingSlugs';

// Browser-only code (window at import time); stand-ins show what they were given
vi.mock('../../media/Image', () => ({
  Image: (props: { fileKey: string; fileId: string; alt?: string }) => (
    <img data-file-key={props.fileKey} data-file-id={props.fileId} alt={props.alt} />
  ),
}));
vi.mock('../../socialFeed', () => ({ AuthorName: ({ odinId }: { odinId: string }) => odinId }));
vi.mock('../../ui/Buttons/ActionLink', () => ({ ActionLink: () => null }));
vi.stubGlobal('window', { location: { origin: 'https://me.example' } });

const options: ArticleDocOptions = {
  imageDrive: { alias: 'a', type: 't' },
  defaultFileId: 'post-file',
  lastModified: 1,
};

const render = (doc: unknown, props: Partial<Parameters<typeof ArticleDocRenderer>[0]> = {}) =>
  renderToStaticMarkup(<ArticleDocRenderer doc={doc as JSONContent} options={options} {...props} />);

test('renders every block of all-blocks.json', () => {
  const html = render(allBlocks);

  expect(html).toContain('<h1 id="every-block"');
  expect(html).toContain('<h3 id="a-third-level-heading"');
  for (const tag of ['<strong', '<em', '<u>', '<del>', '<code', '<kbd', '<sup>', '<sub>', '<blockquote', '<pre', '<ul', '<ol', '<hr'])
    expect(html).toContain(tag);
  expect(html).toContain('<a href="https://example.com"');
  expect(html).toContain('href="https://frodo.dotyou.cloud"');

  // Math through KaTeX, inline and block
  expect(html).toContain('class="katex"');
  expect(html).toContain('katex-display');

  // Code is highlighted
  expect(html).toMatch(/<span class="text-purple-700[^"]*">const<\/span>/);

  // Tables, task lists, callouts, toggles
  expect(html).toContain('<table');
  expect(html).toContain('<th');
  expect(html).toMatch(/<input type="checkbox"[^>]*checked=""/);
  expect(html).toContain('data-variant="warning"');
  expect(html).toContain('<details');
  expect(html).toContain('<summary class="cursor-pointer font-medium">More</summary>');

  // Images go through Image with the post's file; captions in figcaption
  expect(html).toContain('<figure');
  expect(html).toContain('<figcaption class="mt-1 text-center text-sm text-foreground/60">Its caption</figcaption>');
  expect(html).toContain('data-file-key="pst_rtei0" data-file-id="post-file" alt="A photo"');
  expect(html).toContain('style="width:320px"');
  expect(html).toContain('data-gallery="grid"');
  expect(html).toContain('data-file-key="pst_rtei2"');

  // Link preview card
  expect(html).toContain('href="https://example.com/post"');
  expect(html).toContain('Example post');

  // Footnotes link both ways
  expect(html).toContain('<sup id="fnref-fn1"><a href="#fn-fn1"');
  expect(html).toContain('<li id="fn-fn1" value="1"');
  expect(html).toContain('href="#fnref-fn1"');

  // Figures never sit in a <p>
  expect(html).not.toMatch(/<p[^>]*><figure/);
});

test('only http(s) and mailto links are rendered as links', () => {
  const link = (href: string) => ({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }] },
      { type: 'linkPreview', attrs: { url: href, title: 'card' } },
    ],
  });
  expect(render(link('javascript:alert(1)'))).not.toContain('<a');
  expect(render(link('data:text/html,hi'))).not.toContain('<a');
  expect(render(link('mailto:a@b.c'))).toContain('href="mailto:a@b.c"');
});

test('raw HTML in the document is text, never markup', () => {
  const html = render({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] },
      { type: 'toggle', attrs: { summary: '<img src=x onerror=alert(1)>' }, content: [] },
      { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'x' } },
      { type: 'unknownBlock', content: [{ type: 'text', text: 'kept' }] },
    ],
  });
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<img src=x');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('kept');
});

test('a table of contents lists 3+ headings with unique ids', () => {
  const heading = (text: string, level = 2) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
  const doc = { type: 'doc', content: [heading('Intro'), heading('Intro'), heading('Sub', 3)] };

  const html = render(doc, { tableOfContents: true });
  expect(html).toContain('aria-label="Table of contents"');
  expect(html).toContain('href="#intro"');
  expect(html).toContain('href="#intro-2"');
  expect(html).toContain('<h2 id="intro-2"');

  expect(render(doc)).not.toContain('Table of contents');
  expect(render({ type: 'doc', content: [heading('One'), heading('Two')] }, { tableOfContents: true })).not.toContain(
    'Table of contents'
  );
});

test('images with a fileKey need the post options', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { fileKey: 'k' } }] }] };
  expect(render(doc, { options: undefined })).not.toContain('<img');
});

const malformed = {
  type: 'doc',
  content: [
    null,
    'a string',
    42,
    { type: 'constructor', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'under constructor' }] }] },
    { type: 'valueOf', attrs: { level: 2 } },
    { type: 'toString', text: 'proto text' },
    { type: 'paragraph', content: { type: 'text', text: 'object content' } },
    { type: 'paragraph', content: [null, { type: 'text', text: 7 }, { type: 'text', text: { a: 1 } }, { type: 'text', text: 'marked', marks: [null, { type: 'constructor' }, { type: 'bold' }, 'italic'] }] },
    { type: 'heading', attrs: 'big', content: [{ type: 'text', text: 'Odd heading' }] },
    { type: 'bulletList', content: [null, { type: 'listItem', content: 'nope' }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }] }] },
    { type: 'image', attrs: { src: 'https://x.example/a.png', alt: { a: 1 }, caption: ['c'], align: 'constructor' } },
    { type: 'linkPreview', attrs: { url: 'https://example.com', title: { a: 1 }, description: 7 } },
    { type: 'callout', attrs: { variant: 'constructor' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'in callout' }] }] },
    { type: 7, content: [{ type: 'text', text: 'dropped' }] },
  ],
};

test('sanitizeArticleDoc keeps only known, well-formed nodes', () => {
  const clean = sanitizeArticleDoc(malformed);
  const types = (node: JSONContent): string[] => [node.type ?? '', ...(node.content ?? []).flatMap(types)];
  for (const type of types(clean)) expect(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'listItem', 'image', 'linkPreview', 'callout']).toContain(type);
  // An unknown node is replaced by its content, so its text stays
  expect(JSON.stringify(clean)).toContain('under constructor');
  // Content that isn't an array is dropped; text is a string; unknown and malformed marks go
  const paragraphs = (clean.content ?? []).filter((node) => node.type === 'paragraph');
  expect(paragraphs.some((node) => node.content === undefined)).toBe(true);
  const texts = paragraphs.flatMap((node) => node.content ?? []);
  expect(texts.map((node) => node.text)).toEqual(expect.arrayContaining(['7', '', 'marked']));
  expect(texts.find((node) => node.text === 'marked')?.marks).toEqual([{ type: 'bold' }]);
  // Never a prototype key, and no throw on anything that isn't a document
  expect(JSON.stringify(clean)).not.toMatch(/"type":"(constructor|valueOf|toString)"/);
  for (const doc of [null, undefined, 'doc', 3, [], { type: 'doc', content: 'x' }, { type: 'constructor' }])
    expect(sanitizeArticleDoc(doc)).toEqual({ type: 'doc', content: expect.any(Array) });
});

test('a malformed document renders without throwing and keeps its text', () => {
  let html = '';
  expect(() => (html = render(malformed, { tableOfContents: true }))).not.toThrow();
  for (const text of ['under constructor', 'marked', '7', 'item', 'in callout', 'Odd heading'])
    expect(html).toContain(text);
  expect(html).toContain('<strong class="font-bold">marked</strong>');
  expect(html).toContain('data-variant="info"');
  expect(html).not.toContain('[object Object]');
  expect(html).not.toContain('function');
  for (const doc of [null, undefined, 'doc', [null], { content: [null] }, { type: 'doc', content: { a: 1 } }])
    expect(() => render(doc)).not.toThrow();
});

test('heading slugs follow the reference rule', () => {
  expect(slugify('Hello, World!')).toBe('hello-world');
  expect(slugify('  Crème brûlée  ')).toBe('creme-brulee');
  expect(slugify('Ⅻ ½ ﬁve')).toBe('xii-1-2-five');
  expect(slugify('日本語の見出し')).toBe('日本語の見出し');
  expect(slugify('--- ?! ---')).toBe('section');
  expect(slugify('')).toBe('section');
  expect(uniqueHeadingIds(['a', 'a', 'a'])).toEqual(['a', 'a-2', 'a-3']);
  // A generated id is never repeated by a heading whose own slug is that id
  expect(uniqueHeadingIds(['a', 'a', 'a-2'])).toEqual(['a', 'a-2', 'a-2-2']);
  expect(uniqueHeadingIds(['a', 'a-2', 'a'])).toEqual(['a', 'a-2', 'a-3']);
});
