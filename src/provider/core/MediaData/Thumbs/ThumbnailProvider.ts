import { ImageContentType, ImageSize, ThumbnailFile } from '../../DriveData/DriveTypes';
import { ThumbnailInstruction } from '../MediaTypes';
import { fromBlob } from './ImageResizer';

export const baseThumbSizes: ThumbnailInstruction[] = [
  { quality: 100, width: 250, height: 250 },
  { quality: 100, width: 500, height: 500 },
  { quality: 100, width: 1000, height: 1000 },
  { quality: 100, width: 2000, height: 2000 },
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
  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const { naturalSize, thumb: tinyThumb } =
    contentType === svgType
      ? createVectorThumbnail(imageBytes)
      : await createImageThumbnail(imageBytes, tinyThumbSize);

  const applicableThumbSizes = (thumbSizes || baseThumbSizes).reduce((currArray, thumbSize) => {
    if (tinyThumb.contentType === svgType) return currArray;

    if (naturalSize.pixelWidth < thumbSize.width && naturalSize.pixelHeight < thumbSize.height)
      return currArray;

    return [...currArray, thumbSize];
  }, [] as ThumbnailInstruction[]);

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

const createVectorThumbnail = (
  imageBytes: Uint8Array
): { naturalSize: ImageSize; thumb: ThumbnailFile } => {
  return {
    naturalSize: {
      pixelWidth: 50,
      pixelHeight: 50,
    },
    thumb: {
      pixelWidth: 50,
      pixelHeight: 50,
      payload: imageBytes,
      contentType: `image/svg+xml`,
    },
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
            contentType: `image/${format}`,
          },
        };
      });
    }
  );
};
