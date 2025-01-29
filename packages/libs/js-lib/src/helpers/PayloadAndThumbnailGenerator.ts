import {
  EmbeddedThumb,
  NewMediaFile,
  PayloadFile,
  ThumbnailFile,
} from '../core/DriveData/File/DriveFileTypes';
import { ThumbnailInstruction } from '../media/MediaTypes';
import { createThumbnails } from '../media/Thumbs/ThumbnailProvider';
import { processVideoFile } from '../media/Video/VideoProcessor';

const MEDIA_PAYLOAD_KEY = 'fil_mdi';

export const getPayloadsAndThumbnailsForNewMedia = async (
  mediaFiles: NewMediaFile[],
  aesKey: Uint8Array | undefined,
  options?: {
    onUpdate?: (progress: number) => void;
    keyPrefix?: string;
    keyIndex?: number;
    thumbSizes?: ThumbnailInstruction[];
  }
) => {
  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];

  for (let i = 0; mediaFiles && i < mediaFiles?.length; i++) {
    const newMediaFile = mediaFiles[i];
    const payloadKey =
      newMediaFile.key ||
      `${options?.keyPrefix || MEDIA_PAYLOAD_KEY}${(options?.keyIndex || 0) + i}`;
    if (newMediaFile.file.type.startsWith('video/')) {
      const {
        tinyThumb,
        thumbnails: thumbnailsFromVideo,
        payloads: payloadsFromVideo,
      } = await processVideoFile(newMediaFile, payloadKey, aesKey);

      thumbnails.push(...thumbnailsFromVideo);
      payloads.push(...payloadsFromVideo);

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    } else if (newMediaFile.file.type.startsWith('image/')) {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.file,
        payloadKey,
        options?.thumbSizes
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
        previewThumbnail: tinyThumb,
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    } else {
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
        descriptorContent: (newMediaFile.file as File).name || newMediaFile.file.type,
      });
    }
    options?.onUpdate?.((i + 1) / mediaFiles.length);
  }

  return { payloads, thumbnails, previewThumbnails };
};
