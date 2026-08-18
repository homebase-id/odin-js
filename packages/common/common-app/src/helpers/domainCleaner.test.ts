import { expect, test } from 'vitest';
import {
  cleanDomain,
  cleanDomainInput,
  cleanDomainInputWithCaret,
  replaceDomainSeparators,
} from './domainCleaner';

//
// Baseline cleaner behavior (previously untested)
//

test('cleanDomainInput lowercases, maps separators to dots and strips illegal characters', () => {
  expect(cleanDomainInput('Frodo Baggins,example')).toBe('frodo.baggins.example');
  expect(cleanDomainInput('my_domain!.example')).toBe('mydomain.example');
});

test('cleanDomainInput reduces a pasted URL to its host', () => {
  expect(cleanDomainInput('https://Frodo.Example.com/some/path')).toBe('frodo.example.com');
});

test('cleanDomainInput collapses duplicate dots and drops a leading dot, but keeps a single trailing dot', () => {
  expect(cleanDomainInput('frodo..example')).toBe('frodo.example');
  expect(cleanDomainInput('.frodo.example')).toBe('frodo.example');
  expect(cleanDomainInput('frodo.example.')).toBe('frodo.example.');
});

test('cleanDomain also drops trailing dots', () => {
  expect(cleanDomain('frodo.example.')).toBe('frodo.example');
});

//
// Caret preservation. The regression: any cleaning transform (even same-length, like
// A->a or space->dot) makes the controlled input rewrite its DOM value, which used to
// throw the caret to the end - so editing in the middle of a domain jumped. The caret
// must land right after the cleaned version of what preceded it.
//

const type = (before: string, typed: string, after: string) =>
  // Simulates typing `typed` between `before` and `after`: the input's value is the
  // concatenation and the caret sits right after the typed text
  cleanDomainInputWithCaret(before + typed + after, (before + typed).length);

test('typing a space mid-string becomes a dot with the caret staying put', () => {
  expect(type('frodo', ' ', 'example')).toEqual({ value: 'frodo.example', caret: 6 });
});

test('typing an uppercase letter mid-string is lowercased with the caret staying put', () => {
  expect(type('fro', 'D', 'o.example')).toEqual({ value: 'frodo.example', caret: 4 });
});

test('typing an illegal character mid-string strips it and keeps the caret at the insertion point', () => {
  expect(type('frodo', '!', '.example')).toEqual({ value: 'frodo.example', caret: 5 });
});

test('typing a dot next to an existing dot collapses with the caret after the surviving dot', () => {
  expect(type('frodo.', '.', 'example')).toEqual({ value: 'frodo.example', caret: 6 });
});

test('typing a dot at the very start drops it and keeps the caret at 0', () => {
  expect(type('', '.', 'frodo.example')).toEqual({ value: 'frodo.example', caret: 0 });
});

test('typing normally at the end keeps the caret at the end (including a trailing dot)', () => {
  expect(type('frodo.example', '.', '')).toEqual({ value: 'frodo.example.', caret: 14 });
});

test('pasting a URL over everything puts the caret at the end of the host', () => {
  expect(cleanDomainInputWithCaret('https://Frodo.Example.com/path', 30)).toEqual({
    value: 'frodo.example.com',
    caret: 17,
  });
});

test('a null caret (unavailable selection) falls back to the end', () => {
  expect(cleanDomainInputWithCaret('Frodo.example', null)).toEqual({
    value: 'frodo.example',
    caret: 13,
  });
});

test('the caret is clamped to the cleaned value', () => {
  // Prefix cleaning keeps a trailing dot the full clean would collapse away; the
  // caret must never point past the end of the actual value
  const { value, caret } = cleanDomainInputWithCaret('frodo.', 6);
  expect(caret).toBeLessThanOrEqual(value.length);
});

test('separator replacement is 1:1 so the caret index is inherently stable', () => {
  const raw = 'frodo baggins,example';
  expect(replaceDomainSeparators(raw)).toHaveLength(raw.length);
});
