import { expect, test } from 'vitest';
import { isNextArticleEditor, NEXT_ARTICLE_EDITOR_KEY } from './nextArticleEditor';

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

test('is off by default', () => {
  expect(isNextArticleEditor('', memoryStorage)).toBe(false);
  expect(isNextArticleEditor('?editor=other', memoryStorage)).toBe(false);
});

test('?editor=next turns it on and remembers it; ?editor=old turns it off', () => {
  const storage = memoryStorage();
  expect(isNextArticleEditor('?editor=next', () => storage)).toBe(true);
  expect(storage.items.get(NEXT_ARTICLE_EDITOR_KEY)).toBe('1');
  expect(isNextArticleEditor('?channel=abc', () => storage)).toBe(true);

  expect(isNextArticleEditor('?editor=old', () => storage)).toBe(false);
  expect(storage.items.has(NEXT_ARTICLE_EDITOR_KEY)).toBe(false);
  expect(isNextArticleEditor('', () => storage)).toBe(false);
});

test('without storage only the query param counts', () => {
  const blocked = () => {
    throw new Error('SecurityError');
  };
  expect(isNextArticleEditor('?editor=next', blocked)).toBe(true);
  expect(isNextArticleEditor('', blocked)).toBe(false);
});
