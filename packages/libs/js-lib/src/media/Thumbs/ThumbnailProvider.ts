import { uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { ImageContentType, ImageSize, ThumbnailFile, EmbeddedThumb } from '../../core/core';
import { ThumbnailInstruction } from '../MediaTypes';
import { DecodedImage, getTargetSize, decodeImage, drawImageToCanvas, encodeCanvas, releaseCanvas } from './ImageResizer';

export const baseThumbSizes: ThumbnailInstruction[] = [
  { quality: 84, maxPixelDimension: 320, maxBytes: 26 * 1024 },
  { quality: 84, maxPixelDimension: 640, maxBytes: 102 * 1024 },
  { quality: 76, maxPixelDimension: 1080, maxBytes: 291 * 1024 },
  { quality: 76, maxPixelDimension: 1600, maxBytes: 640 * 1024 },
];

export const tinyThumbSize: ThumbnailInstruction = {
  quality: 76,
  maxPixelDimension: 20,
  maxBytes: 768, // 1024 limit in core base64(byte[768]).Length ~= 1.33*786
};


// Homebase rejects any thumbnail over 1 MiB
export const MAX_THUMBNAIL_BYTES = 1024 * 1024;

const svgType = 'image/svg+xml';
const gifType = 'image/gif';

// Helper: ensure we pass an ArrayBuffer (not ArrayBufferLike) into Blob for TS/dom typings
const toArrayBuffer = (u8: Uint8Array): ArrayBuffer => {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
};

const getEmbeddedThumbOfThumbnailFile = async (
  thumbnailFile: ThumbnailFile,
  naturalSize: ImageSize
): Promise<EmbeddedThumb> => {
  return {
    pixelWidth: naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    pixelHeight: naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    contentType: thumbnailFile.payload.type as ImageContentType,
    content: uint8ArrayToBase64(new Uint8Array(await thumbnailFile.payload.arrayBuffer())),
  };
};

export const getRevisedThumbs = (
  sourceSize: ImageSize,
  thumbs: ThumbnailInstruction[]
): ThumbnailInstruction[] => {
  const sourceMax = Math.max(sourceSize.pixelWidth, sourceSize.pixelHeight);
  const thresholdMin = Math.floor((90 * sourceMax) / 100);
  const thresholdMax = Math.floor((110 * sourceMax) / 100);

  // Filter thumbnails: keep those not larger than sourceMax and outside 10% range
  const keptThumbs = thumbs.filter(
    (t) =>
      (t.maxPixelDimension ?? 0) <= sourceMax &&
      ((t.maxPixelDimension ?? 0) < thresholdMin ||
        (t.maxPixelDimension ?? 0) > thresholdMax)
  );

  // If any thumbnails were removed, add the source size as a thumbnail
  if (keptThumbs.length < thumbs.length) {
    // Find the thumbnail with closest maxPixelDimension
    const nearestThumb = thumbs
      .slice()
      .sort(
        (a, b) =>
          Math.abs((a.maxPixelDimension ?? 0) - sourceMax) -
          Math.abs((b.maxPixelDimension ?? 0) - sourceMax)
      )[0];

    let maxBytes: number;
    if (
      nearestThumb &&
      nearestThumb.maxPixelDimension &&
      nearestThumb.maxBytes
    ) {
      const scale = sourceMax / nearestThumb.maxPixelDimension;
      maxBytes = Math.round(nearestThumb.maxBytes * scale);
      // Clamp between 10KB and 1MB
      maxBytes = Math.max(10 * 1024, Math.min(maxBytes, 1024 * 1024));
    } else {
      maxBytes = 300 * 1024;
    }

    keptThumbs.push({
      quality: sourceMax <= 640 ? 84 : 76,
      maxPixelDimension: sourceMax,
      maxBytes,
    });
  }

  return keptThumbs.sort(
    (a, b) => (a.maxPixelDimension ?? 0) - (b.maxPixelDimension ?? 0)
  );
};

export const createThumbnails = async (
  image: Blob,
  payloadKey: string,
  thumbSizes?: ThumbnailInstruction[]
): Promise<{
  naturalSize: ImageSize;
  tinyThumb: EmbeddedThumb;
  additionalThumbnails: ThumbnailFile[];
}> => {
  if (typeof document === 'undefined')
    throw new Error('Thumbnails can only be created in a browser environment');

  const imageBytes = await new Uint8Array(await image.arrayBuffer());
  if (!imageBytes || imageBytes.length === 0) {
    throw new Error('No image data found');
  }

  const contentType = image.type as ImageContentType;

  if (image.type === svgType) {
    const vectorThumb = await createVectorThumbnail(imageBytes, payloadKey);
    const tinyResult = await createImageThumbnail(imageBytes, payloadKey, tinyThumbSize, true, svgType);  // Pass svgType

    return {
      naturalSize: vectorThumb.naturalSize,
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(tinyResult.thumb, vectorThumb.naturalSize),
      additionalThumbnails: [vectorThumb.thumb],
    };
  }

  if (contentType === gifType) {
    // For GIFs, only generate a tiny thumb in WebP format
    const { naturalSize, thumb: tinyThumb } = await createImageThumbnail(
      imageBytes,
      payloadKey,
      tinyThumbSize,
      true,
      gifType
    );

    // Only include the original GIF as an additional thumbnail if it's < 1 MB
    const includeOriginalGif = image.size < 1024 * 1024; // 1 MB

    const additionalThumbnails: ThumbnailFile[] = includeOriginalGif
      ? [
        {
          pixelWidth: naturalSize.pixelWidth,
          pixelHeight: naturalSize.pixelHeight,
          payload: image,
          key: payloadKey,
        },
      ]
      : [];

    return {
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(tinyThumb, naturalSize),
      naturalSize,
      additionalThumbnails,
    };
  }

  // Decode once and make one thumbnail at a time, to keep memory low (iOS)
  const decoded = await decodeImage(image);
  try {
    const naturalSize: ImageSize = { pixelWidth: decoded.naturalWidth, pixelHeight: decoded.naturalHeight };

    // Create a thumbnail that fits scaled into a 20 x 20 canvas
    const tinyThumb = await thumbnailFromImage(decoded, image, payloadKey, tinyThumbSize, true);

    const requestedSizes = thumbSizes || baseThumbSizes;

    const applicableThumbSizes: ThumbnailInstruction[] = getRevisedThumbs(naturalSize, requestedSizes);

    // Create additionalThumbnails
    const additionalThumbnails: ThumbnailFile[] = [tinyThumb];
    for (const thumbSize of applicableThumbSizes) {
      const thumb = await thumbnailFromImage(decoded, image, payloadKey, thumbSize, false);
      // Never send a thumbnail the server rejects
      if (thumb.payload.size <= MAX_THUMBNAIL_BYTES) additionalThumbnails.push(thumb);
    }

    return {
      naturalSize,
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(tinyThumb, naturalSize),
      additionalThumbnails,
    };
  } finally {
    decoded.close();
  }
};

const createVectorThumbnail = async (
  imageBytes: Uint8Array,
  payloadKey: string
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const fallbackNaturalSize: ImageSize = {
    pixelWidth: 50,
    pixelHeight: 50,
  };
  const thumb: ThumbnailFile = {
    pixelWidth: 50,
    pixelHeight: 50,
    payload: new Blob([toArrayBuffer(imageBytes)], { type: svgType }),
    key: payloadKey,
  };

  const imageSizePromise: Promise<ImageSize | null> = new Promise((resolve) => {
    try {
      const inMemoryImage = new Image();
      inMemoryImage.onload = () =>
        resolve({ pixelWidth: inMemoryImage.width, pixelHeight: inMemoryImage.height });
      inMemoryImage.onerror = () => resolve(null);

      inMemoryImage.src = `data:image/svg+xml;base64,${uint8ArrayToBase64(imageBytes)}`;
    } catch {
      resolve(null);
    }
  });

  const naturalSize = await imageSizePromise;

  return {
    naturalSize: naturalSize || fallbackNaturalSize,
    thumb,
  };
};

export const createImageThumbnail = async (
  imageBytes: Uint8Array,
  payloadKey: string,
  instruction: ThumbnailInstruction,
  isTinyThumb: boolean = false,
  originalContentType?: string  // The blob type, e.g. image/svg+xml; the thumbnail is always encoded in instruction.type
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  // Create typed input blob (fixes SVG loading for both naturalSize and resize)
  const inputBlob = new Blob([toArrayBuffer(imageBytes)], { type: originalContentType || '' });

  const image = await decodeImage(inputBlob);
  try {
    return {
      naturalSize: { pixelWidth: image.naturalWidth, pixelHeight: image.naturalHeight },
      thumb: await thumbnailFromImage(image, inputBlob, payloadKey, instruction, isTinyThumb),
    };
  } finally {
    image.close();
  }
};

// Resize to fit maxPixelDimension, then lower the quality until it fits maxBytes
const thumbnailFromImage = async (
  image: DecodedImage,
  inputBlob: Blob,
  payloadKey: string,
  instruction: ThumbnailInstruction,
  isTinyThumb: boolean
): Promise<ThumbnailFile> => {
  // Thumbnails are webp whatever the source type (jpeg where the browser can't encode webp)
  const targetFormatType = isTinyThumb ? 'webp' : instruction.type || 'webp';

  let maxDimension = instruction.maxPixelDimension;
  let quality = instruction.quality;
  let size = getTargetSize(image, maxDimension, maxDimension);

  // If the image is already the exact target size, in the target format and within maxBytes, keep it as-is
  if (
    !isTinyThumb &&
    size.width === image.naturalWidth &&
    size.height === image.naturalHeight &&
    inputBlob.type === `image/${targetFormatType}` &&
    inputBlob.size <= instruction.maxBytes
  ) {
    return { pixelWidth: size.width, pixelHeight: size.height, payload: inputBlob, key: payloadKey };
  }

  let canvas = drawImageToCanvas(image, size, isTinyThumb);
  let blob: Blob;
  try {
    blob = await encodeCanvas(canvas, targetFormatType, quality);

    // Reduce quality until size <= maxBytes or quality reaches 1, re-encoding the already resized canvas
    for (let round = 0; blob.size > instruction.maxBytes && quality > 1 && round < 20; round++) {
      const excessRatio = blob.size / instruction.maxBytes;
      const qualityDrop = Math.min(40, Math.max(5, Math.round(quality * excessRatio * 0.5)));
      quality = Math.max(1, quality - qualityDrop);
      blob = await encodeCanvas(canvas, targetFormatType, quality);

      // For some strange images we cannot fit them into a 20x20 thumb even with quality 1;
      // in such a case, shrink the tiny thumb
      if (blob.size > instruction.maxBytes && quality <= 2 && isTinyThumb) {
        if (maxDimension === 1) {
          throw new Error('The world has ended. A 1x1 thumb in quality 1 takes up more than MaxBytes bytes...');
        }
        maxDimension = Math.max(1, maxDimension - 5);
        size = getTargetSize(image, maxDimension, maxDimension);
        releaseCanvas(canvas);
        canvas = drawImageToCanvas(image, size, isTinyThumb);
        quality = 2;
        blob = await encodeCanvas(canvas, targetFormatType, quality);
      }
    }
  } finally {
    releaseCanvas(canvas);
  }

  return { pixelWidth: size.width, pixelHeight: size.height, payload: blob, key: payloadKey };
};
