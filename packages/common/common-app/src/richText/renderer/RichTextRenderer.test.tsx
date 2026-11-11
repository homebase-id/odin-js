import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichTextRenderer } from './RichTextRenderer';

// These pull in browser-only code (window at import time); the tests don't render them.
vi.mock('../../media/Image', () => ({ Image: () => null }));
vi.mock('../../ui/Buttons/ActionLink', () => ({ ActionLink: () => null }));
vi.mock('../../socialFeed', () => ({ AuthorName: () => null }));

const render = (body: unknown) =>
  renderToStaticMarkup(<RichTextRenderer body={body as Record<string, unknown>[]} />);

test('does not throw on a non-array object body and renders its text', () => {
  expect(render({ children: [{ text: 'hello' }] })).toContain('hello');
  expect(render({ some: 'thing' })).toContain('thing');
});

test('marks nest instead of overwriting each other', () => {
  const html = render([
    { type: 'p', children: [{ text: 'x', bold: true, italic: true, underline: true, kbd: true }] },
  ]);
  for (const tag of ['strong', 'em', 'u', 'kbd']) expect(html).toContain(`<${tag}`);
});

test('does not leak node fields onto DOM elements', () => {
  const html = render([
    { type: 'p', id: 'abc', url: 'http://x', fileKey: 'k', value: 'v', children: [{ text: 'hi' }] },
  ]);
  expect(html).toContain('hi');
  for (const attr of ['id=', 'url=', 'fileKey=', 'value=']) expect(html).not.toContain(attr);
});

test('does not throw on malformed entries in an array body', () => {
  // null renders nothing, a string renders as text
  expect(render([null, 'plain text', undefined, 3])).toContain('plain text');
  expect(render([null, 'plain text', 3])).toContain('3');
  expect(render([[{ text: 'nested' }], true, { type: 'p', children: [null, 'inner'] }])).toContain('inner');
  // children that aren't an array count as none
  expect(() => render([{ type: 'p', children: { text: 'x' } }])).not.toThrow();
  expect(() => render([{ type: 'ul', children: 'abc' }, { type: 'li', children: 5 }])).not.toThrow();
  // odd field types
  expect(render([{ type: 'p', children: [{ text: 42 }] }])).toContain('42');
  expect(() => render([{ type: { a: 1 }, children: [{ text: 'typed' }] }])).not.toThrow();
  expect(() => render([{ type: 'a', url: 5, children: [{ text: 'link' }] }])).not.toThrow();
  expect(() => render([{ type: 'link', linkText: { a: 1 }, linkTarget: 'https://x' }])).not.toThrow();
});
