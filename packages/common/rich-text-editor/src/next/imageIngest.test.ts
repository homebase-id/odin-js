import { expect, test } from 'vitest';
import { planImageIngest, reencodedFileInfo, scaleToMaxEdge } from './imageIngest';

test('every JPEG, HEIC, PNG and WebP is re-encoded, however small, so its metadata is dropped', () => {
  expect(planImageIngest({ type: 'image/jpeg' })).toEqual({ action: 'reencode', outType: 'image/jpeg' });
  expect(planImageIngest({ type: 'image/heic' })).toEqual({ action: 'reencode', outType: 'image/jpeg' });
  expect(planImageIngest({ type: 'image/heif' })).toEqual({ action: 'reencode', outType: 'image/jpeg' });
  // PNG stays PNG, for transparency
  expect(planImageIngest({ type: 'image/png' })).toEqual({ action: 'reencode', outType: 'image/png' });
  expect(planImageIngest({ type: 'image/webp' })).toEqual({ action: 'reencode', outType: 'image/webp' });
  // Anything else a canvas can read becomes a PNG
  expect(planImageIngest({ type: 'image/bmp' })).toEqual({ action: 'reencode', outType: 'image/png' });
});

test('GIFs are kept as they are, so they stay animated', () => {
  expect(planImageIngest({ type: 'image/gif' })).toEqual({ action: 'keep' });
});

test('a re-encoded file is named after what the canvas wrote', () => {
  expect(reencodedFileInfo('photo.JPG', 'image/jpeg', 'image/jpeg')).toEqual({ name: 'photo.jpg', type: 'image/jpeg' });
  expect(reencodedFileInfo('shot.png', 'image/png', 'image/png')).toEqual({ name: 'shot.png', type: 'image/png' });
  expect(reencodedFileInfo('a.webp', 'image/webp', 'image/webp')).toEqual({ name: 'a.webp', type: 'image/webp' });
  // Safari can't encode WebP and writes PNG
  expect(reencodedFileInfo('a.webp', 'image/png', 'image/webp')).toEqual({ name: 'a.png', type: 'image/png' });
  expect(reencodedFileInfo('.png', '', 'image/png')).toEqual({ name: 'image.png', type: 'image/png' });
});

test('images are scaled down to a 2560px long edge, never up', () => {
  expect(scaleToMaxEdge(5120, 2560)).toEqual({ width: 2560, height: 1280 });
  expect(scaleToMaxEdge(800, 600)).toEqual({ width: 800, height: 600 });
});
