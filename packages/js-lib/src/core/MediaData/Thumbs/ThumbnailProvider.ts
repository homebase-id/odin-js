import { EmbeddedThumb } from '../../../../core';
import { uint8ArrayToBase64 } from '../../../helpers/DataUtil';
import { ImageContentType, ImageSize, ThumbnailFile } from '../../core';
import { ThumbnailInstruction } from '../MediaTypes';
import { fromBlob } from './ImageResizer';

export const baseThumbSizes: ThumbnailInstruction[] = [
  { quality: 75, width: 250, height: 250 },
  { quality: 75, width: 600, height: 600 },
  { quality: 75, width: 1600, height: 1600 },
];

export const tinyThumbSize: ThumbnailInstruction = {
  quality: 10,
  width: 20,
  height: 20,
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
  key: string,
  thumbSizes?: ThumbnailInstruction[]
): Promise<{
  naturalSize: ImageSize;
  tinyThumb: EmbeddedThumb;
  additionalThumbnails: ThumbnailFile[];
}> => {
  if (typeof document === 'undefined')
    throw new Error('Thumbnails can only be created in a browser environment');

  const imageBytes = await new Uint8Array(await image.arrayBuffer());
  const contentType = image.type as ImageContentType;

  if (image.type === svgType) {
    const vectorThumb = await createVectorThumbnail(imageBytes, key);

    return {
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(vectorThumb.thumb, vectorThumb.naturalSize),
      naturalSize: vectorThumb.naturalSize,
      additionalThumbnails: [],
    };
  }

  if (contentType === gifType) {
    const gifThumb = await createImageThumbnail(imageBytes, key, { ...tinyThumbSize, type: 'gif' });

    return {
      tinyThumb: await getEmbeddedThumbOfThumbnailFile(gifThumb.thumb, gifThumb.naturalSize),
      naturalSize: gifThumb.naturalSize,
      additionalThumbnails: [],
    };
  }

  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const { naturalSize, thumb: tinyThumb } = await createImageThumbnail(
    imageBytes,
    key,
    tinyThumbSize
  );

  const applicableThumbSizes = (thumbSizes || baseThumbSizes).reduce((currArray, thumbSize) => {
    if (tinyThumb.payload.type === svgType) return currArray;

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
        async (thumbSize) => await (await createImageThumbnail(imageBytes, key, thumbSize)).thumb
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
  key: string
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const fallbackNaturalSize: ImageSize = {
    pixelWidth: 50,
    pixelHeight: 50,
  };
  const thumb: ThumbnailFile = {
    pixelWidth: 50,
    pixelHeight: 50,
    payload: new Blob([imageBytes], { type: svgType }),
    key,
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

  return {
    naturalSize: naturalSize || fallbackNaturalSize,
    thumb,
  };
};

const createImageThumbnail = async (
  imageBytes: Uint8Array,
  key: string,
  instruction: ThumbnailInstruction
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const blob: Blob = new Blob([imageBytes], {});
  const type = instruction.type || 'webp';

  return fromBlob(blob, instruction.quality, instruction.width, instruction.height, type).then(
    (resizedData) => {
      return {
        naturalSize: {
          pixelWidth: resizedData.naturalSize.width,
          pixelHeight: resizedData.naturalSize.height,
        },
        thumb: {
          pixelWidth: resizedData.size.width,
          pixelHeight: resizedData.size.height,
          payload: resizedData.blob,
          contentType: `image/${type}`,
          key,
        },
      };
    }
  );
};
