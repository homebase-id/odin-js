import { describe, expect, it } from 'vitest';
import { getRangeHeader, getRangePath, toV2QueryString } from './DriveFileHelper';

describe('getRangePath', () => {
  it('is empty for a whole payload', () => {
    expect(getRangePath()).toEqual({ startOffset: 0, updatedChunkStart: undefined, rangePath: '' });
  });

  it('covers exactly the bytes the V1 Range header asked for', () => {
    const { rangeHeader } = getRangeHeader(100, 200);
    expect(rangeHeader).toBe('bytes=80-207');
    expect(getRangePath(100, 200)).toEqual({
      startOffset: 20,
      updatedChunkStart: 80,
      rangePath: '/80/128',
    });
  });

  it('reads from the start of the payload', () => {
    expect(getRangePath(0, 1000).rangePath).toBe('/0/1008');
  });

  it('reads to the end with a length of 0 when there is no end', () => {
    expect(getRangePath(50).rangePath).toBe('/32/0');
  });
});

describe('toV2QueryString', () => {
  it('leaves out undefined values, and the ? when nothing is left', () => {
    expect(toV2QueryString({ lastModified: undefined })).toBe('');
    expect(toV2QueryString({ width: 10, height: 20, lastModified: undefined })).toBe(
      '?width=10&height=20'
    );
  });
});
