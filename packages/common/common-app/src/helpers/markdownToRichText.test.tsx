import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { markdownToRichText } from './markdownToRichText';
import { getRichTextFromString } from './richTextHelper';
import { RichTextRenderer } from '../richText/renderer/RichTextRenderer';

vi.mock('../media/Image', () => ({ Image: () => null }));
vi.mock('../ui/Buttons/ActionLink', () => ({ ActionLink: () => null }));
vi.mock('../socialFeed', () => ({ AuthorName: () => null }));

const p = (...children: unknown[]) => ({ type: 'p', children });

describe('plain captions keep the tree they get today', () => {
  test.each([
    'Just a caption',
    'Sunny day ☀️🌊 with friends 👨‍👩‍👧',
    'Read https://example.com/a_b_c?x=1 now',
    'Thanks @frodo.dotyou.cloud and @sam.dotyou.cloud!',
    '@frodo.dotyou.cloud at the start',
    '5 * 3 = 15',
    'snake_case and file_name_here',
    '#tag #another',
    '2024. What a year',
    'Big news\n---',
    'Big news\n===',
    'First line\nsecond line\nthird line',
    'One paragraph\n\nAnother one',
    'Trailing spaces  \nnext line',
    'a < b && c > d',
    '    indented like code',
    '| a | b |\n| - | - |\n| 1 | 2 |',
    '![cat](https://example.com/cat.png)',
    '',
  ])('%j', (caption) => {
    expect(markdownToRichText(caption)).toEqual(getRichTextFromString(caption));
  });
});

describe('markdown', () => {
  test.each<[string, unknown]>([
    ['**bold** text', [p({ text: 'bold', bold: true }, { text: ' text' })]],
    ['*it* and _it_', [p({ text: 'it', italic: true }, { text: ' and ' }, { text: 'it', italic: true })]],
    ['~~gone~~', [p({ text: 'gone', strikethrough: true })]],
    ['***both***', [p({ text: 'both', italic: true, bold: true })]],
    ['use `npm ci`', [p({ text: 'use ' }, { text: 'npm ci', code: true })]],
    [
      '```ts\nconst a = 1;\n\nlet b;\n```',
      [
        {
          type: 'code_block',
          children: ['const a = 1;', '', 'let b;'].map((text) => ({
            type: 'code_line',
            children: [{ text }],
          })),
        },
      ],
    ],
    ['# One', [{ type: 'h1', children: [{ text: 'One' }] }]],
    ['## Two', [{ type: 'h2', children: [{ text: 'Two' }] }]],
    ['### Three', [{ type: 'h3', children: [{ text: 'Three' }] }]],
    ['###### Six', [{ type: 'h3', children: [{ text: 'Six' }] }]],
    [
      '- a\n- **b**',
      [
        {
          type: 'ul',
          children: [
            { type: 'li', children: [{ text: 'a' }] },
            { type: 'li', children: [{ text: 'b', bold: true }] },
          ],
        },
      ],
    ],
    [
      '1. a\n2. b\n   - c',
      [
        {
          type: 'ol',
          children: [
            { type: 'li', children: [{ text: 'a' }] },
            {
              type: 'li',
              children: [
                { text: 'b' },
                { type: 'ul', children: [{ type: 'li', children: [{ text: 'c' }] }] },
              ],
            },
          ],
        },
      ],
    ],
    ['> quoted', [{ type: 'blockquote', children: [p({ text: 'quoted' })] }]],
    [
      'above\n\n---\n\nbelow',
      [p({ text: 'above' }), { type: 'hr', children: [{ text: '' }] }, p({ text: 'below' })],
    ],
    [
      '[site](https://example.com)',
      [p({ type: 'a', url: 'https://example.com', children: [{ text: 'site' }] })],
    ],
    [
      '**hi** @frodo.dotyou.cloud see https://example.com',
      [
        p(
          { text: 'hi', bold: true },
          { text: ' ' },
          { type: 'mention', value: 'frodo.dotyou.cloud' },
          { text: ' see ' },
          { type: 'a', url: 'https://example.com', text: 'https://example.com' }
        ),
      ],
    ],
    ['**a**\nb', [p({ text: 'a', bold: true }, { text: '\nb' })]],
    [
      'Big news\n---\n\n**more**',
      [p({ text: 'Big news\n---' }), p({ text: 'more', bold: true })],
    ],
    ['**x**\n\n2024. What a year', [p({ text: 'x', bold: true }), p({ text: '2024. What a year' })]],
    ['\\*not italic\\*', [p({ text: '*' }, { text: 'not italic' }, { text: '*' })]],
  ])('%j', (caption, expected) => {
    expect(markdownToRichText(caption)).toEqual(expected);
  });
});

describe('unsafe input stays inert', () => {
  const render = (caption: string) =>
    renderToStaticMarkup(
      <RichTextRenderer body={markdownToRichText(caption) as Record<string, unknown>[]} />
    );

  test.each([
    '**x** <script>alert(1)</script>',
    '<script>alert(1)</script>\n\n**x**',
    '**x** <img src=x onerror="alert(1)">',
    '**x** [click](javascript:alert(1))',
    '**x** [click](JAVASCRIPT:alert(1))',
    '**x** [click](data:text/html,<script>alert(1)</script>)',
    '**x** <javascript:alert(1)>',
    '[ref]: javascript:alert(1)\n\n**x** [ref]',
  ])('%j', (caption) => {
    const tree = JSON.stringify(markdownToRichText(caption));
    expect(tree).not.toMatch(/"url":"(?!https?:)/i);

    const html = render(caption);
    expect(html).not.toMatch(/<(script|img)/i);
    expect(html).not.toMatch(/href="(javascript|data):/i);
    expect(html).toContain('<strong');
  });
});
