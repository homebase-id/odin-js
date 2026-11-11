import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JSONContent } from '@tiptap/core';
import allBlocks from '../../../../../libs/js-lib/src/public/posts/ArticleBody/fixtures/tiptap/all-blocks.json';
import journalNote from '../../../../../libs/js-lib/src/public/posts/ArticleBody/fixtures/tiptap/journal-note.json';
import {
  ArticleDocRenderer,
  sanitizeArticleDoc,
  type ArticleDocOptions,
} from './ArticleDocRenderer';
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
  renderToStaticMarkup(
    <ArticleDocRenderer doc={doc as JSONContent} options={options} {...props} />
  );

test('renders every block of all-blocks.json', () => {
  const html = render(allBlocks);

  expect(html).toContain('<h1 id="every-block"');
  expect(html).toContain('<h3 id="a-third-level-heading"');
  for (const tag of [
    '<strong',
    '<em',
    '<u>',
    '<del>',
    '<code',
    '<kbd',
    '<sup>',
    '<sub>',
    '<blockquote',
    '<pre',
    '<ul',
    '<ol',
    '<hr',
  ])
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
  expect(html).toMatch(/<summary[^>]*>.*More<\/summary>/);

  // Images go through Image with the post's file; captions in figcaption
  expect(html).toContain('<figure');
  expect(html).toContain(
    '<figcaption class="mt-1.5 block text-center text-sm text-foreground/60">Its caption</figcaption>'
  );
  expect(html).toContain('data-file-key="pst_rtei0" data-file-id="post-file" alt="A photo"');
  expect(html).toContain('style="--image-width:320px"');
  expect(html).toContain('data-gallery="grid"');
  expect(html).toContain('data-file-key="pst_rtei2"');

  // Link preview card
  expect(html).toContain('href="https://example.com/post"');
  expect(html).toContain('Example post');

  // Footnotes link both ways
  expect(html).toContain('<sup id="fnref-fn1" class="scroll-mt-20"><a href="#fn-fn1"');
  expect(html).toContain('<li id="fn-fn1" value="1"');
  expect(html).toContain('href="#fnref-fn1"');

  // Figures never sit in a <p>
  expect(html).not.toMatch(/<p[^>]*><figure/);
});

test('only http(s) and mailto links are rendered as links', () => {
  const link = (href: string) => ({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }],
      },
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
  const heading = (text: string, level = 2) => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  });
  const doc = { type: 'doc', content: [heading('Intro'), heading('Intro'), heading('Sub', 3)] };

  const html = render(doc, { tableOfContents: true });
  expect(html).toContain('aria-label="Table of contents"');
  expect(html).toContain('href="#intro"');
  expect(html).toContain('href="#intro-2"');
  expect(html).toContain('<h2 id="intro-2"');

  expect(render(doc)).not.toContain('Table of contents');
  expect(
    render({ type: 'doc', content: [heading('One'), heading('Two')] }, { tableOfContents: true })
  ).not.toContain('Table of contents');
});

test('images with a fileKey need the post options', () => {
  const doc = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { fileKey: 'k' } }] }],
  };
  expect(render(doc, { options: undefined })).not.toContain('<img');
});

const malformed = {
  type: 'doc',
  content: [
    null,
    'a string',
    42,
    {
      type: 'constructor',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'under constructor' }] }],
    },
    { type: 'valueOf', attrs: { level: 2 } },
    { type: 'toString', text: 'proto text' },
    { type: 'paragraph', content: { type: 'text', text: 'object content' } },
    {
      type: 'paragraph',
      content: [
        null,
        { type: 'text', text: 7 },
        { type: 'text', text: { a: 1 } },
        {
          type: 'text',
          text: 'marked',
          marks: [null, { type: 'constructor' }, { type: 'bold' }, 'italic'],
        },
      ],
    },
    { type: 'heading', attrs: 'big', content: [{ type: 'text', text: 'Odd heading' }] },
    {
      type: 'bulletList',
      content: [
        null,
        { type: 'listItem', content: 'nope' },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
        },
      ],
    },
    {
      type: 'image',
      attrs: {
        src: 'https://x.example/a.png',
        alt: { a: 1 },
        caption: ['c'],
        align: 'constructor',
      },
    },
    { type: 'linkPreview', attrs: { url: 'https://example.com', title: { a: 1 }, description: 7 } },
    {
      type: 'callout',
      attrs: { variant: 'constructor' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'in callout' }] }],
    },
    { type: 7, content: [{ type: 'text', text: 'dropped' }] },
  ],
};

test('sanitizeArticleDoc keeps only known, well-formed nodes', () => {
  const clean = sanitizeArticleDoc(malformed);
  const types = (node: JSONContent): string[] => [
    node.type ?? '',
    ...(node.content ?? []).flatMap(types),
  ];
  for (const type of types(clean))
    expect([
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'listItem',
      'image',
      'linkPreview',
      'callout',
    ]).toContain(type);
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
  for (const doc of [
    null,
    undefined,
    'doc',
    3,
    [],
    { type: 'doc', content: 'x' },
    { type: 'constructor' },
  ])
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
  for (const doc of [
    null,
    undefined,
    'doc',
    [null],
    { content: [null] },
    { type: 'doc', content: { a: 1 } },
  ])
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

/** The text a reader sees: the markup without its tags, entities decoded. */
const visibleText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

/** Every piece of text in a document: text nodes, note-link labels, toggle titles, captions. */
const textsOf = (node: JSONContent): string[] => [
  ...(node.type === 'text' && node.text ? [node.text] : []),
  ...(node.type === 'noteLink' && node.attrs?.label ? [node.attrs.label] : []),
  ...(node.type === 'toggle' && node.attrs?.summary ? [node.attrs.summary] : []),
  ...(node.type === 'image' && node.attrs?.caption ? [node.attrs.caption] : []),
  ...(node.type === 'linkPreview' && node.attrs?.title ? [node.attrs.title] : []),
  ...(node.content ?? []).flatMap(textsOf),
];

describe('a note published from Journal', () => {
  const doc = journalNote as JSONContent;
  let html = '';
  test('renders without throwing', () => {
    expect(() => (html = render(doc, { tableOfContents: true }))).not.toThrow();
  });

  test('drops no text', () => {
    const text = visibleText(html);
    const missing = textsOf(doc).filter((piece) => !text.includes(piece));
    expect(missing).toEqual([]);
  });

  test('aligns and indents headings and paragraphs', () => {
    expect(html).toMatch(/<h2 id="centred-and-indented"[^>]*style="text-align:center"/);
    expect(html).toMatch(/<h3 id="an-indented-third-level-heading"[^>]*style="padding-left:4rem"/);
    expect(html).toContain('style="text-align:justify;padding-left:2rem"');
    expect(html).toContain('style="text-align:right"');
    for (const level of [4, 5, 6]) expect(html).toContain(`<h${level} id="heading-level-${level}"`);
  });

  test('renders every mark', () => {
    for (const tag of [
      '<strong',
      '<em>',
      '<del>',
      '<u>underline</u>',
      '<sub>2</sub>',
      '<sup>2</sup>',
      '<code',
    ])
      expect(html).toContain(tag);
    expect(html).toContain('href="https://example.com/page"');
  });

  test('shows note links as their labels, never as journal: links', () => {
    expect(visibleText(html)).toContain('a note link Another note plus Wiki title.');
    expect(html).not.toContain('journal:');
    expect(html).not.toContain('7d1c2a4e');
  });

  test('nests task lists and lists', () => {
    expect(html.match(/data-type="taskList"/g)).toHaveLength(3);
    expect(html.match(/<input type="checkbox"/g)).toHaveLength(5);
    expect(html).toContain('<ol');
  });

  test('renders each callout variant, the toggle, the table and the preview card', () => {
    for (const variant of ['info', 'tip', 'warning', 'error'])
      expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toMatch(/<summary[^>]*>.*Open me<\/summary>/);
    expect(html.match(/<th /g)).toHaveLength(2);
    expect(html).toContain('href="https://example.com/preview-target"');
    expect(html).toContain('src="https://picsum.photos/id/30/400/300"');
  });

  test("applies an image's crop, rotation, flips, width and alignment", () => {
    expect(html).toMatch(
      /<figure[^>]*style="--image-width:480px" data-crop="0.1,0.1,0.6,0.8" data-rotate="90" data-flip="h"/
    );
    expect(html).toMatch(/<figure class="[^"]*min-\[600px\]:mx-auto/);
    expect(html).toMatch(
      /<span class="[^"]*min-\[600px\]:float-right[^"]*" style="--image-width:240px" data-flip="v"/
    );
    expect(html).toMatch(
      /<span class="[^"]*min-\[600px\]:float-left[^"]*" style="--image-width:200px" data-rotate="180"/
    );
    // Until the image loads, the edited frame is hidden rather than showing the original
    expect(html).toContain(
      'data-edited-image="" class="w-full rounded-lg" style="visibility:hidden"'
    );
    // An image in a paragraph of text never puts a figure in a <p>
    expect(html).not.toMatch(/<p[\s>](?:(?!<\/p>).)*<figure/);
  });

  test('shows an image it cannot load as a placeholder with its caption', () => {
    expect(html).not.toContain('attachment://');
    expect(html).toContain('Image not available');
    expect(html).toContain('Its caption survives');
  });

  test('lays out each gallery', () => {
    for (const layout of ['row', 'grid', 'masonry', 'carousel'])
      expect(html).toContain(`data-gallery="${layout}"`);
    // Four images in a row gallery: two rows of two, wide and narrow
    expect(html).toMatch(
      /<span aria-hidden="true" class="hidden [^"]*min-\[481px\]:block max-\[480px\]:block"><\/span>/
    );
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Show image 2 of 2"');
    // A cropped image in a gallery carries its crop, for the row's aspect ratio
    expect(html).toContain('data-crop="0,0.25,1,0.5"');
  });

  test('highlights code by the first word of its info string only', () => {
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('data-language="html"');
    expect(html).toContain('data-language="react"');
    expect(html).toContain('data-language="mermaid"');
    // The rest of the info string reaches no attribute
    expect(html).not.toContain('k3f9');
    expect(html).not.toMatch(/="[^"]*id=x/);
    // react is highlighted as JavaScript
    expect(html).toMatch(/<span class="text-purple-700[^"]*">export<\/span>/);
  });

  test('shows live blocks as code under a label, and an svg drawing as an image', () => {
    expect(html.match(/Interactive block — shown as code/g)).toHaveLength(2);
    expect(html.match(/Diagram — shown as code/g)).toHaveLength(1);
    expect(html).toMatch(/<img src="data:image\/svg\+xml;charset=utf-8,%3Csvg[^"]*" alt=""/);
    // Their markup is text: no script, no handler, no frame
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<button onclick');
    expect(html).not.toContain('<iframe');
  });

  test('links footnotes both ways and lists the headings', () => {
    expect(html).toContain('<sup id="fnref-1" class="scroll-mt-20"><a href="#fn-1"');
    expect(html).toContain('href="#fnref-1"');
    expect(html).toContain('aria-label="Table of contents"');
  });
});

test('a hostile info string only ever reaches data-language as a bare word', () => {
  const html = render({
    type: 'doc',
    content: [
      {
        type: 'codeBlock',
        attrs: { language: 'x"><img src=x onerror=alert(1)> id=abcd' },
        content: [{ type: 'text', text: 'code' }],
      },
      {
        type: 'codeBlock',
        attrs: { language: { not: 'a string' } },
        content: [{ type: 'text', text: 'more code' }],
      },
      { type: 'codeBlock', attrs: { language: 'svg' } },
    ],
  });
  expect(html).toContain('data-language="ximg"');
  expect(html).not.toContain('onerror=');
  expect(html).toContain('more code');
  // An empty svg block is an empty code block, not an empty image
  expect(html).not.toContain('data:image/svg');
});

test('an unknown node keeps its text, and an unknown inline atom is dropped without breaking the paragraph', () => {
  const html = render({
    type: 'doc',
    content: [
      {
        type: 'liveEmbed',
        attrs: { src: 'x' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'inside unknown' }] }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'before ' },
          { type: 'emoji', attrs: { name: 'x' } },
          { type: 'text', text: 'after' },
        ],
      },
    ],
  });
  expect(html).toContain('inside unknown');
  expect(html).toContain('before after');
});
