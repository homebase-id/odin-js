/**
 * From journal's lib/images/imageIngest.ts: downscale, re-orient and strip metadata before an image
 * reaches the article's pending files. `createImageBitmap(..., { imageOrientation: 'from-image' })`
 * bakes in the EXIF orientation, and re-encoding through a canvas keeps only the pixels, so EXIF,
 * XMP and IPTC (GPS position, device, time) are dropped.
 *
 * Every JPEG, HEIC, PNG and WebP is re-encoded, however small: unlike journal, a small PNG or WebP
 * is not kept as it is, since it can carry EXIF/XMP too. GIFs are the exception, kept as they are so
 * they stay animated; a GIF can carry XMP (in an application extension block), which is kept.
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

type OutType = 'image/jpeg' | 'image/png' | 'image/webp';

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** What happens to an image of `type`: kept as it is (GIF only) or re-encoded as `outType`. */
export function planImageIngest({ type }: { type: string }):
  | { action: 'keep' }
  | { action: 'reencode'; outType: OutType } {
  // Kept so it stays animated. Its XMP, if any, stays too
  if (type === 'image/gif') return { action: 'keep' };
  if (type === 'image/jpeg' || type === 'image/heic' || type === 'image/heif')
    return { action: 'reencode', outType: 'image/jpeg' };
  // WebP where the browser can encode it; Safari's canvas.toBlob('image/webp') returns PNG instead
  if (type === 'image/webp') return { action: 'reencode', outType: 'image/webp' };
  // PNG stays PNG for its transparency, and so does anything else a canvas can read
  return { action: 'reencode', outType: 'image/png' };
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

/** The name and type of a re-encoded file: what the canvas wrote, which may not be what was asked. */
export function reencodedFileInfo(name: string, blobType: string, asked: OutType) {
  const type = Object.hasOwn(EXTENSIONS, blobType) ? blobType : asked;
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return { name: `${base}.${EXTENSIONS[type]}`, type };
}

/** The file to store for an image the writer added: downscaled to 2560px and without metadata. */
export async function prepareImageForUpload(file: File): Promise<File> {
  const plan = planImageIngest({ type: file.type });
  if (plan.action === 'keep') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    if (file.type === 'image/heic' || file.type === 'image/heif') throw new UnsupportedImageError();
    throw error;
  }

  try {
    const { width, height } = scaleToMaxEdge(bitmap.width, bitmap.height);
    const blob = await encode(bitmap, width, height, plan.outType);
    const { name, type } = reencodedFileInfo(file.name, blob.type, plan.outType);
    return new File([blob], name, { type });
  } finally {
    bitmap.close();
  }
}
