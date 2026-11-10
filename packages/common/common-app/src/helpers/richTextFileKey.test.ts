import { expect, test } from 'vitest';
import { getNextRteFileKey } from './richTextFileKey';

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
