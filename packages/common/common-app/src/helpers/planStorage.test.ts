import { describe, expect, it } from 'vitest';
import { planStorageText } from './planStorage';

const GB = 1024 ** 3;
const TB = 1024 ** 4;
const MB = 1024 ** 2;

describe('planStorageText', () => {
  it('says a little used on a big plan in the plan unit', () => {
    expect(planStorageText(85.24 * MB, 500 * GB)).toEqual({
      percent: null,
      size: '500 GB',
      used: { amount: '0.1 GB', under: false },
      free: '499.9 GB',
    });
  });

  it('says under the smallest step when used rounds to nothing', () => {
    const text = planStorageText(2 * MB, 1 * TB);
    expect(text.used).toEqual({ amount: '0.01 TB', under: true });
    expect(text.free).toBe('1 TB');
  });

  it('uses two decimals on a plan under 10 of its unit', () => {
    const text = planStorageText(0.29 * TB, 1 * TB);
    expect(text).toMatchObject({ percent: 29, size: '1 TB', free: '0.71 TB' });
    expect(text.used.amount).toBe('0.29 TB');
  });

  it('says 99% until it is full, and 100% when it is', () => {
    expect(planStorageText(499.9 * GB, 500 * GB).percent).toBe(99);
    expect(planStorageText(500 * GB, 500 * GB).percent).toBe(100);
    expect(planStorageText(510 * GB, 500 * GB)).toMatchObject({ percent: 100, free: '0 GB' });
  });

  it('says 0% when nothing is stored', () => {
    expect(planStorageText(0, 60 * GB)).toMatchObject({
      percent: 0,
      used: { amount: '0 GB', under: false },
    });
  });

  it('keeps a half unit plan size', () => {
    expect(planStorageText(0, 1.5 * TB).size).toBe('1.5 TB');
  });
});
