import { jsonStringify64 } from '../../helpers/DataUtil';
import {
  EmbeddedThumb,
  KeyHeader,
  PayloadFile,
  ThumbnailFile,
} from '../../core/DriveData/File/DriveFileTypes';
import { createThumbnails } from '../Thumbs/ThumbnailProvider';
import { segmentVideoFileWithFfmpeg, getThumbnailWithFfmpeg } from './VideoSegmenterFfmpeg';

const megaByte = 1024 * 1024;

export const processVideoFile = async (
  videoFile: { file: File | Blob; thumbnail?: ThumbnailFile },
  payloadKey: string,
  encryptionKey?: KeyHeader,
  experimentalHls?: boolean
): Promise<{
  tinyThumb: EmbeddedThumb | undefined;
  payloads: PayloadFile[];
  thumbnails: ThumbnailFile[];
}> => {
  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

  // Creating video thumbnail
  const thumbnail = await (async () => {
    const passedThumbnail = 'thumbnail' in videoFile ? videoFile.thumbnail?.payload : undefined;

    // Safari is bad at grabbing a thumbnail from a video preview and can give a blank image
    if (!passedThumbnail || passedThumbnail?.size < 1 * megaByte) {
      try {
        return (await getThumbnailWithFfmpeg(videoFile.file)) || passedThumbnail;
      } catch {
        // Ignore; Grabbing can fail (it's not that important)
      }
    }

    return passedThumbnail;
  })();

  const { tinyThumb, additionalThumbnails } = thumbnail
    ? await createThumbnails(thumbnail, payloadKey, [{ quality: 100, width: 250, height: 250 }])
    : { tinyThumb: undefined, additionalThumbnails: [] };

  thumbnails.push(...additionalThumbnails);

  // Processing video
  const { metadata, ...videoData } = await segmentVideoFileWithFfmpeg(
    videoFile.file,
    encryptionKey,
    experimentalHls
  );

  if ('segments' in videoData) {
    const { segments } = videoData;
    payloads.push({
      key: payloadKey,
      payload: segments,
      descriptorContent: jsonStringify64(metadata),
      skipEncryption: true,
    });
  } else {
    payloads.push({
      key: payloadKey,
      payload: videoData.video,
      descriptorContent: metadata ? jsonStringify64(metadata) : undefined,
    });
  }

  return {
    tinyThumb,
    thumbnails,
    payloads,
  };
};
