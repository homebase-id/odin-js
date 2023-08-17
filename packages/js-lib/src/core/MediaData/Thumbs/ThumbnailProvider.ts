import { uint8ArrayToBase64 } from '../../../helpers/DataUtil';
import { ImageContentType, ImageSize, ThumbnailFile } from '../../core';
import { ThumbnailInstruction } from '../MediaTypes';
import { fromBlob } from './ImageResizer';

export const baseThumbSizes: ThumbnailInstruction[] = [
  { quality: 75, width: 250, height: 250 },
  { quality: 75, width: 600, height: 600 },
  { quality: 75, width: 1600, height: 1600 },
];

const tinyThumbSize: ThumbnailInstruction = {
  quality: 10,
  width: 20,
  height: 20,
};

const svgType = 'image/svg+xml';

export const createThumbnails = async (
  imageBytes: Uint8Array,
  contentType?: ImageContentType,
  thumbSizes?: ThumbnailInstruction[]
): Promise<{
  naturalSize: ImageSize;
  tinyThumb: ThumbnailFile;
  additionalThumbnails: ThumbnailFile[];
}> => {
  if (typeof document === 'undefined')
    throw new Error('Thumbnails can only be created in a browser environment');

  if (contentType === svgType) {
    const vectorThumb = await createVectorThumbnail(imageBytes);

    return {
      tinyThumb: vectorThumb.thumb,
      naturalSize: vectorThumb.naturalSize,
      additionalThumbnails: [],
    };
  }

  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const { naturalSize, thumb: tinyThumb } = await createImageThumbnail(imageBytes, tinyThumbSize);

  const applicableThumbSizes = (thumbSizes || baseThumbSizes).reduce((currArray, thumbSize) => {
    if (tinyThumb.contentType === svgType) return currArray;

    if (naturalSize.pixelWidth < thumbSize.width && naturalSize.pixelHeight < thumbSize.height)
      return currArray;

    return [...currArray, thumbSize];
  }, [] as ThumbnailInstruction[]);

  if (
    applicableThumbSizes.length !== (thumbSizes || baseThumbSizes).length &&
    !applicableThumbSizes.some((thumbSize) => thumbSize.width === naturalSize.pixelWidth)
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
        async (thumbSize) => await (await createImageThumbnail(imageBytes, thumbSize)).thumb
      )
    )),
  ];

  return { naturalSize, tinyThumb, additionalThumbnails };
};

const createVectorThumbnail = async (
  imageBytes: Uint8Array
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const fallbackNaturalSize: ImageSize = {
    pixelWidth: 50,
    pixelHeight: 50,
  };
  const thumb: ThumbnailFile = {
    pixelWidth: 50,
    pixelHeight: 50,
    payload: imageBytes,
    contentType: `image/svg+xml`,
  };

  const imageSizePromise: Promise<ImageSize | null> = new Promise((resolve) => {
    try {
      const inMemoryImage = new Image();
      inMemoryImage.onload = () =>
        resolve({ pixelWidth: inMemoryImage.width, pixelHeight: inMemoryImage.height });
      inMemoryImage.onerror = () => resolve(null);

      inMemoryImage.src = `data:image/svg+xml;base64,${uint8ArrayToBase64(imageBytes)}`;
    } catch (e) {
      resolve(null);
    }
  });

  const naturalSize = await imageSizePromise;
  console.log({ naturalSize });

  return {
    naturalSize: naturalSize || fallbackNaturalSize,
    thumb,
  };
};

const createImageThumbnail = async (
  imageBytes: Uint8Array,
  instruction: ThumbnailInstruction,
  format: 'webp' | 'png' | 'bmp' | 'jpeg' | 'gif' = 'webp'
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const blob: Blob = new Blob([imageBytes], {});

  return fromBlob(blob, instruction.quality, instruction.width, instruction.height, format).then(
    (resizedData) => {
      return resizedData.blob.arrayBuffer().then((buffer) => {
        const contentByteArray = new Uint8Array(buffer);

        return {
          naturalSize: {
            pixelWidth: resizedData.naturalSize.width,
            pixelHeight: resizedData.naturalSize.height,
          },
          thumb: {
            pixelWidth: resizedData.size.width,
            pixelHeight: resizedData.size.height,
            payload: contentByteArray,
            contentType: `image/${instruction.type || format}`,
          },
        };
      });
    }
  );
};
