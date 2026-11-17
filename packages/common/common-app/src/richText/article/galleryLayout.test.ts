import { describe, expect, test } from 'vitest';
import { columnsAt, galleryColumns, galleryRowBreaks } from './galleryLayout';

describe('galleryColumns', () => {
  test('reads an integer from 1 to 6', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) expect(galleryColumns(n)).toBe(n);
    expect(galleryColumns('4')).toBe(4);
  });

  test('anything else is no setting', () => {
    for (const value of [undefined, null, 0, 7, -2, 2.5, NaN, '', ' ', 'three', {}, [3]])
      expect(galleryColumns(value)).toBeUndefined();
  });
});

test('at or below 480px, a gallery has at most two columns', () => {
  expect([1, 2, 3, 6].map((n) => columnsAt(n, true))).toEqual([1, 2, 2, 2]);
  expect([1, 2, 3, 6].map((n) => columnsAt(n, false))).toEqual([1, 2, 3, 6]);
});

describe('galleryRowBreaks', () => {
  // The rows the breaks make, as their sizes, at each width
  const rows = (count: number, mode: 'wide' | 'narrow', columns?: number) => {
    const starts = galleryRowBreaks(count, columns)
      .filter((b) => b.modes.includes(mode))
      .map((b) => b.index);
    return [0, ...starts].map((start, i) => (starts[i] ?? count) - start);
  };

  test('without columns: balanced threes, and pairs on a phone', () => {
    expect(rows(4, 'wide')).toEqual([2, 2]);
    expect(rows(7, 'wide')).toEqual([3, 2, 2]);
    expect(rows(5, 'narrow')).toEqual([2, 2, 1]);
  });

  test('with columns: at most that many per row, balanced', () => {
    expect(rows(5, 'wide', 4)).toEqual([3, 2]);
    expect(rows(8, 'wide', 4)).toEqual([4, 4]);
    expect(rows(6, 'wide', 6)).toEqual([6]);
    expect(rows(5, 'narrow', 4)).toEqual([2, 2, 1]);
  });

  test('one column: one image per row at every width', () => {
    expect(rows(3, 'wide', 1)).toEqual([1, 1, 1]);
    expect(rows(3, 'narrow', 1)).toEqual([1, 1, 1]);
  });
});
