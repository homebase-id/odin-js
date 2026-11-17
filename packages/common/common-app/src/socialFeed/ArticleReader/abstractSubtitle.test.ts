import { describe, expect, test } from 'vitest';
import { abstractSubtitle, openingText } from './abstractSubtitle';

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
