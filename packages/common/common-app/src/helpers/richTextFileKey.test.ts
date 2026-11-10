import { expect, test } from 'vitest';
import { appendRteFile, getNextRteFileKey, withoutUnusedRteFiles } from './richTextFileKey';

test('starts at 0 with no files', () => {
  expect(getNextRteFileKey([])).toBe('pst_rtei0');
});

test('does not reuse an index after a removal in the middle', () => {
  // pst_rtei1 was removed; length-based keys would produce pst_rtei2 again
  expect(getNextRteFileKey([{ key: 'pst_rtei0' }, { key: 'pst_rtei2' }])).toBe('pst_rtei3');
});

test('ignores unrelated and undefined keys', () => {
  expect(getNextRteFileKey([{ key: 'pst_text' }, { key: undefined }, { key: 'pst_rtei1x' }])).toBe(
    'pst_rtei0'
  );
});

test('appends each image under its own key, also several in a row', () => {
  const first = appendRteFile([{ key: 'pst_rtei0' }], new Blob(['a']));
  const second = appendRteFile(first.files, new Blob(['b']));
  expect([first.key, second.key]).toEqual(['pst_rtei1', 'pst_rtei2']);
  expect(second.files.map((f) => f.key)).toEqual(['pst_rtei0', 'pst_rtei1', 'pst_rtei2']);
});

test('drops images added while editing that the document no longer has', () => {
  const blob = new Blob(['x']);
  const files = [
    { key: 'pst_rtei0' }, // on the server already
    { key: 'pst_rtei1', file: blob }, // the hero image
    { key: 'pst_rtei2', file: blob }, // in the document
    { key: 'pst_rtei3', file: blob }, // removed again
    { key: 'pst_text', file: blob },
  ];
  const doc = {
    content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { fileKey: 'pst_rtei2' } }] }],
  };
  expect(withoutUnusedRteFiles(files, doc, ['pst_rtei1']).map((f) => f.key)).toEqual([
    'pst_rtei0',
    'pst_rtei1',
    'pst_rtei2',
    'pst_text',
  ]);
});
