/**
 * From journal's lib/images/imageIngest.ts: downscale, re-orient and strip EXIF before an image
 * reaches the article's pending files. `createImageBitmap(..., { imageOrientation: 'from-image' })`
 * bakes in the EXIF orientation, and re-encoding through a canvas drops every other EXIF tag.
 */

export class UnsupportedImageError extends Error {
  constructor(message = "This browser can't read this image format") {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_EDGE = 2560;
const QUALITY = 0.85;
// PNG/WebP are only re-encoded when they're big; small ones are left alone.
const PNG_WEBP_REENCODE_THRESHOLD_BYTES = 2 * 1024 * 1024;

type OutType = 'image/jpeg' | 'image/png';

export function planImageIngest({
  type,
  size,
  width,
  height,
}: {
  type: string;
  size: number;
  width: number;
  height: number;
}): { action: 'keep' | 'reencode'; outType: OutType } {
  // Always re-encoded, even when small, to strip EXIF (GPS, device)
  if (type === 'image/jpeg' || type === 'image/heic' || type === 'image/heif')
    return { action: 'reencode', outType: 'image/jpeg' };
  if (type === 'image/png' || type === 'image/webp') {
    const big = Math.max(width, height) > MAX_EDGE || size > PNG_WEBP_REENCODE_THRESHOLD_BYTES;
    // Not WebP: Safari's canvas.toBlob('image/webp') silently returns PNG
    return { action: big ? 'reencode' : 'keep', outType: 'image/png' };
  }
  // GIF (keeps its animation) and anything else
  return { action: 'keep', outType: 'image/png' };
}

/** Scales down to fit `maxEdge`, keeping the aspect ratio; never upscales. */
export function scaleToMaxEdge(width: number, height: number, maxEdge = MAX_EDGE) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return { width, height };
  const scale = maxEdge / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function encode(bitmap: ImageBitmap, width: number, height: number, type: OutType) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      type,
      QUALITY
    )
  );
}

/** The file to store for an image the writer added: downscaled to 2560px and without EXIF. */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    if (file.type === 'image/heic' || file.type === 'image/heif') throw new UnsupportedImageError();
    throw error;
  }

  try {
    const plan = planImageIngest({
      type: file.type,
      size: file.size,
      width: bitmap.width,
      height: bitmap.height,
    });
    if (plan.action === 'keep') return file;
    const { width, height } = scaleToMaxEdge(bitmap.width, bitmap.height);
    const blob = await encode(bitmap, width, height, plan.outType);
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.${plan.outType === 'image/jpeg' ? 'jpg' : 'png'}`, {
      type: plan.outType,
    });
  } finally {
    bitmap.close();
  }
}
