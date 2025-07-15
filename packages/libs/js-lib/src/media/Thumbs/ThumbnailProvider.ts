import { uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { ImageContentType, ImageSize, ThumbnailFile, EmbeddedThumb } from '../../core/core';
import { ThumbnailInstruction } from '../MediaTypes';
import { resizeImageFromBlob, getTargetSize } from './ImageResizer';

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


const svgType = 'image/svg+xml';
const gifType = 'image/gif';

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


    const originalGifThumb: ThumbnailFile = {
      pixelWidth: naturalSize.pixelWidth,
      pixelHeight: naturalSize.pixelHeight,
      payload: image,
      key: payloadKey,
    };

    return {
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(tinyThumb, naturalSize),
      naturalSize,
      additionalThumbnails: [originalGifThumb], // Include original GIF
    };
  }

  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const { naturalSize, thumb: tinyThumb } = await createImageThumbnail(
    imageBytes,
    payloadKey,
    tinyThumbSize,
    true,
  );

  const requestedSizes = thumbSizes || baseThumbSizes;

  const applicableThumbSizes: ThumbnailInstruction[] = getRevisedThumbs(naturalSize, requestedSizes);

  // if (
  //   applicableThumbSizes.length !== (thumbSizes || baseThumbSizes).length &&
  //   !applicableThumbSizes.some((thumbSize) => thumbSize.width === naturalSize.pixelWidth) &&
  //   tinyThumb.pixelWidth !== naturalSize.pixelWidth // if the tinyThumb is the same size as the naturalSize we don't need to add it again
  // ) {
  //   // Source image is too small for some of the requested sizes so we add the source dimensions as exact size
  //   applicableThumbSizes.push({
  //     quality: 100,
  //     width: naturalSize.pixelWidth,
  //     height: naturalSize.pixelHeight,
  //   });
  // }

  // Create additionalThumbnails
  const additionalThumbnails: ThumbnailFile[] = [
    tinyThumb,
    ...(await Promise.all(
      applicableThumbSizes.map(
        async (thumbSize) =>
          await (
            await createImageThumbnail(imageBytes, payloadKey, thumbSize, false, contentType)
          ).thumb
      )
    )),
  ];

  return {
    naturalSize,
    tinyThumb: await getEmbeddedThumbOfThumbnailFile(tinyThumb, naturalSize),
    additionalThumbnails,
  };
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
    payload: new Blob([imageBytes], { type: svgType }),
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

const createImageThumbnail = async (
  imageBytes: Uint8Array,
  payloadKey: string,
  instruction: ThumbnailInstruction,
  isTinyThumb: boolean = false,
  originalContentType?: string  // The blobl type, e.g. image:svg+xml
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {

  let targetFormatType = instruction.type || 'webp';
  if (isTinyThumb) targetFormatType = 'webp';

  // Create typed input blob (fixes SVG loading for both naturalSize and resize)
  const inputBlob = new Blob([imageBytes], { type: originalContentType || '' });

// Get natural size directly using Image element
  const naturalSize = await new Promise<ImageSize>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(inputBlob);
    reader.onload = () => {
      const img = new Image();
      if (!reader.result || typeof reader.result !== 'string') {
        reject(new Error('Failed to read image data'));
        return;
      }
      img.src = reader.result;
      img.onload = () => {
        const size = getTargetSize(img, undefined, undefined);
        resolve({
          pixelWidth: size.width,
          pixelHeight: size.height
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Failed to read blob'));
    };
  });

  const maxTargetSize: ImageSize = {
    pixelWidth: instruction.maxPixelDimension,
    pixelHeight: instruction.maxPixelDimension,
  };

  let quality = instruction.quality;
  let currentInputBlob = inputBlob;

  let resizedData = await resizeImageFromBlob(
    currentInputBlob,
    quality,
    maxTargetSize.pixelWidth,
    maxTargetSize.pixelHeight,
    targetFormatType,
    isTinyThumb,
    instruction.maxBytes
  );

  // Reduce quality until size <= MaxBytes or quality reaches 1
  while (resizedData.blob.size > instruction.maxBytes && quality > 1) {
    const excessRatio = resizedData.blob.size / instruction.maxBytes;
    const qualityDrop = Math.min(40, Math.max(5, Math.floor(quality * excessRatio * 0.5)));
    quality = Math.max(1, quality - qualityDrop);

    // Create new source blob, preserving type from appropriate source
    const sourceArrayBuffer = await (isTinyThumb ? resizedData.blob.arrayBuffer() : currentInputBlob.arrayBuffer());
    const sourceType = isTinyThumb ? resizedData.blob.type : currentInputBlob.type;
    const sourceBlob = new Blob([sourceArrayBuffer], { type: sourceType });
    
    resizedData = await resizeImageFromBlob(
      sourceBlob,
      quality,
      maxTargetSize.pixelWidth,
      maxTargetSize.pixelHeight,
      targetFormatType,
      isTinyThumb,
      instruction.maxBytes
    );

    if (resizedData.blob.size > instruction.maxBytes && quality < 2 && isTinyThumb) {
      if (maxTargetSize.pixelWidth === 1) {
        throw new Error("The world has ended. A 1x1 thumb in quality 1 takes up more than MaxBytes bytes...");
      }

      // Ok we're in trouble... wild hack attempt here, let's try to make a thumb from the thumb
      currentInputBlob = resizedData.blob;

      // For some strange images we cannot fit them into a 20x20 thumb even with quality 1.
      // In such a case, make the thumb half the size
      quality = 2; // To make while run again
      maxTargetSize.pixelWidth = Math.max(1, maxTargetSize.pixelWidth - 5);
      maxTargetSize.pixelHeight = Math.max(1, maxTargetSize.pixelHeight - 5);
    }
  }

  const thumb: ThumbnailFile = {
    pixelWidth: resizedData.size.width,
    pixelHeight: resizedData.size.height,
    payload: resizedData.blob,
    // contentType: `image/${targetFormatType}`,
    key: payloadKey,
  };

  return {
    naturalSize,
    thumb,
  };
};