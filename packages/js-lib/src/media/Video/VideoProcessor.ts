import { jsonStringify64 } from '../../helpers/DataUtil';
import {
  EmbeddedThumb,
  PayloadFile,
  ThumbnailFile,
} from '../../core/DriveData/File/DriveFileTypes';
import { createThumbnails } from '../Thumbs/ThumbnailProvider';
import { segmentVideoFileWithFfmpeg, getThumbnailWithFfmpeg } from './VideoSegmenterFfmpeg';
import { KeyHeader } from '../../../core';

const megaByte = 1024 * 1024;

export const processVideoFile = async (
  videoFile: { file: File | Blob; thumbnail?: ThumbnailFile },
  payloadKey: string,
  encryptionKey?: KeyHeader
): Promise<{
  tinyThumb: EmbeddedThumb | undefined;
  payloads: PayloadFile[];
  thumbnails: ThumbnailFile[];
  keyHeader?: Uint8Array;
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
    encryptionKey
  );

  if ('segments' in videoData) {
    const { playlist, segments } = videoData;
    // keyHeader = videoData.keyHeader;
    payloads.push({
      key: payloadKey,
      payload: playlist,
      descriptorContent: jsonStringify64(metadata),
    });

    for (let j = 0; j < segments.length; j++) {
      thumbnails.push({
        key: payloadKey,
        payload: segments[j],
        pixelHeight: j,
        pixelWidth: j,
        skipEncryption: true,
      });
    }
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
    // keyHeader: videoData.keyHeader,
  };
};
