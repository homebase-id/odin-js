import { describe, expect, test } from 'vitest';
import { abstractSubtitle, openingExcerpt, openingText } from './abstractSubtitle';

const p = (...texts: string[]) => ({
  type: 'paragraph',
  children: texts.map((text) => ({ text })),
});
const body = [
  { type: 'image', children: [{ text: '' }] },
  p('I pressed Enter once on a ', 'used mini PC', ' and walked away.'),
  p('Then it set itself up.'),
];

describe('openingText', () => {
  test('is the first block with text, through its inline children', () => {
    expect(openingText(body)).toBe('I pressed Enter once on a used mini PC and walked away.');
  });

  test('is a plain body as it is, and empty without one', () => {
    expect(openingText('Just text')).toBe('Just text');
    expect(openingText(undefined)).toBe('');
    expect(openingText([])).toBe('');
  });
});

describe('openingExcerpt', () => {
  test('joins the first paragraphs and leaves out headings and images', () => {
    const doc = [
      { type: 'h1', children: [{ text: 'A title' }] },
      ...body,
    ];
    expect(openingExcerpt(doc)).toBe(
      'I pressed Enter once on a used mini PC and walked away. Then it set itself up.'
    );
  });

  test('stops after the paragraph that reaches the limit, cut at the limit', () => {
    const long = [p('a'.repeat(50)), p('b'.repeat(50)), p('c'.repeat(50))];
    expect(openingExcerpt(long, 80)).toBe(`${'a'.repeat(50)} ${'b'.repeat(29)}`);
  });

  test('leaves out a code block or a quote it starts with', () => {
    const code = {
      type: 'code_block',
      children: [{ type: 'code_line', children: [{ text: 'npm install' }] }],
    };
    const quote = { type: 'blockquote', children: [{ text: 'Someone said this.' }] };
    expect(openingExcerpt([code, quote, p('The article starts here.')])).toBe(
      'The article starts here.'
    );
  });

  test('keeps the items of a list it starts with apart', () => {
    const li = (text: string) => ({
      type: 'li',
      children: [{ type: 'lic', children: [{ text }] }],
    });
    const list = { type: 'ul', children: [li('Apples'), li('Pears'), li('Plums')] };
    expect(openingExcerpt([list, p('Then the rest.')])).toBe('Apples Pears Plums Then the rest.');
  });

  test('is a plain body as it is, and empty without one', () => {
    expect(openingExcerpt('Just  text')).toBe('Just text');
    expect(openingExcerpt(undefined)).toBe('');
  });
});

describe('abstractSubtitle', () => {
  test('is undefined without an abstract', () => {
    expect(abstractSubtitle(undefined, body)).toBeUndefined();
    expect(abstractSubtitle('', body)).toBeUndefined();
    expect(abstractSubtitle('   \n ', body)).toBeUndefined();
  });

  test('is undefined when the abstract is the opening paragraph', () => {
    expect(
      abstractSubtitle('I pressed Enter once on a used mini PC and walked away.', body)
    ).toBeUndefined();
  });

  test('ignores case, spacing and trailing punctuation', () => {
    expect(
      abstractSubtitle('  i pressed ENTER once on a used\nmini PC and walked away!!  ', body)
    ).toBeUndefined();
  });

  test('is undefined when the abstract is the start of the opening paragraph', () => {
    expect(abstractSubtitle('I pressed Enter once on a used mini…', body)).toBeUndefined();
    expect(abstractSubtitle('I pressed Enter once...', body)).toBeUndefined();
  });

  test('is the abstract when it says something else', () => {
    const abstract = 'How a $120 mini PC became an always-on agent box.';
    expect(abstractSubtitle(abstract, body)).toBe(abstract);
  });

  test('is the abstract when it runs past the opening paragraph', () => {
    const abstract = 'I pressed Enter once on a used mini PC and walked away. It works.';
    expect(abstractSubtitle(abstract, body)).toBe(abstract);
  });

  test('is the abstract for an empty body', () => {
    expect(abstractSubtitle('A summary', [])).toBe('A summary');
  });
});
