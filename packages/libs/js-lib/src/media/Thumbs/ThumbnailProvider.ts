import { uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { ImageContentType, ImageSize, ThumbnailFile, EmbeddedThumb } from '../../core/core';
import { ThumbnailInstruction } from '../MediaTypes';
import { resizeImageFromBlob } from './ImageResizer';

export const baseThumbSizes: ThumbnailInstruction[] = [
  { quality: 75, width: 400, height: 400 },
  { quality: 75, width: 1600, height: 1600 },
];

export const tinyThumbSize: ThumbnailInstruction = {
  quality: 10,
  width: 20,
  height: 20,
};

export const tinyGifThumbSize: ThumbnailInstruction = {
  quality: 10,
  width: 10,
  height: 10,
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
  const originalFileSize = image.size;

  if (image.type === svgType) {
    const vectorThumb = await createVectorThumbnail(imageBytes, payloadKey);

    return {
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(vectorThumb.thumb, vectorThumb.naturalSize),
      naturalSize: vectorThumb.naturalSize,
      additionalThumbnails: [vectorThumb.thumb],
    };
  }

  if (contentType === gifType) {
    const gifThumb = await createImageThumbnail(imageBytes, payloadKey, {
      ...tinyGifThumbSize,
      type: 'gif',
    }, originalFileSize);

    return {
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(gifThumb.thumb, gifThumb.naturalSize),
      naturalSize: gifThumb.naturalSize,
      additionalThumbnails: [
        {
          key: payloadKey,
          payload: image,
          ...gifThumb.naturalSize,
        },
      ],
    };
  }

  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const { naturalSize, thumb: tinyThumb } = await createImageThumbnail(
    imageBytes,
    payloadKey,
    tinyThumbSize,
    originalFileSize
  );
  const applicableThumbSizes = (thumbSizes || baseThumbSizes).reduce((currArray, thumbSize) => {
    if (tinyThumb.payload.type === svgType) return currArray;

    if (naturalSize.pixelWidth < thumbSize.width && naturalSize.pixelHeight < thumbSize.height)
      return currArray;

    return [...currArray, thumbSize];
  }, [] as ThumbnailInstruction[]);

  if (
    applicableThumbSizes.length !== (thumbSizes || baseThumbSizes).length &&
    !applicableThumbSizes.some((thumbSize) => thumbSize.width === naturalSize.pixelWidth) &&
    tinyThumb.pixelWidth !== naturalSize.pixelWidth // if the tinyThumb is the same size as the naturalSize we don't need to add it again
  ) {
    // Source image is too small for some of the requested sizes so we add the source dimensions as exact size
    applicableThumbSizes.push({
      quality: 100,
      width: naturalSize.pixelWidth,
      height: naturalSize.pixelHeight,
    });
  }

  // Create additionalThumbnails
  const additionalThumbnails: ThumbnailFile[] = [
    tinyThumb,
    ...(await Promise.all(
      applicableThumbSizes.map(
        async (thumbSize) =>
          await (
            await createImageThumbnail(imageBytes, payloadKey, thumbSize, originalFileSize)
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
  originalFileSize?: number
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const blob: Blob = new Blob([new Uint8Array(imageBytes)], {});
  const type = instruction.type || 'webp';

  return resizeImageFromBlob(
    blob,
    instruction.quality,
    instruction.width,
    instruction.height,
    type
  ).then((resizedData) => {
    const naturalWidth = resizedData.naturalSize.width;
    const naturalHeight = resizedData.naturalSize.height;
    const targetWidth = instruction.width;
    const targetHeight = instruction.height;
    const maxFileSizeForSkipResize = 500 * 1024; // 500KB

    // Check if dimensions already match the target and file size is under 500KB for larger dimensions
    const dimensionsMatch = naturalWidth === targetWidth && naturalHeight === targetHeight;
    const isLargerDimension = targetWidth >= LARGE_DIMENSION_THRESHOLD_PX || targetHeight >= LARGE_DIMENSION_THRESHOLD_PX; // Consider dimensions >= threshold as larger
    const isUnder500KB = originalFileSize && originalFileSize <= maxFileSizeForSkipResize;

    if (dimensionsMatch && (!isLargerDimension || isUnder500KB)) {
      // Use original image without resizing
      return {
        naturalSize: {
          pixelWidth: naturalWidth,
          pixelHeight: naturalHeight,
        },
        thumb: {
          pixelWidth: naturalWidth,
          pixelHeight: naturalHeight,
          payload: blob, // Use original blob
          contentType: blob.type || `image/${type}`,
          key: payloadKey,
        },
      };
    }

    // Check if the resized thumbnail is larger than the original file
    // If so, use the original blob instead
    if (originalFileSize && resizedData.blob.size > originalFileSize) {
      return {
        naturalSize: {
          pixelWidth: naturalWidth,
          pixelHeight: naturalHeight,
        },
        thumb: {
          pixelWidth: naturalWidth,
          pixelHeight: naturalHeight,
          payload: blob,
          contentType: blob.type || `image/${type}`,
          key: payloadKey,
        },
      };
    }

    return {
      naturalSize: {
        pixelWidth: naturalWidth,
        pixelHeight: naturalHeight,
      },
      thumb: {
        pixelWidth: resizedData.size.width,
        pixelHeight: resizedData.size.height,
        payload: resizedData.blob,
        contentType: `image/${type}`,
        key: payloadKey,
      },
    };
  });
};
