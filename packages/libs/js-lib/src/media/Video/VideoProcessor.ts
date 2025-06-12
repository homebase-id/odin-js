import { jsonStringify64 } from '../../helpers/DataUtil';
import {
  EmbeddedThumb,
  KeyHeader,
  PayloadFile,
  ThumbnailFile,
} from '../../core/DriveData/File/DriveFileTypes';
import { createThumbnails } from '../Thumbs/ThumbnailProvider';
import { segmentVideoFileWithFfmpeg, getThumbnailWithFfmpeg } from './VideoSegmenterFfmpeg';
import { GenerateKeyHeader } from '../../core/DriveData/Upload/UploadHelpers';

const megaByte = 1024 * 1024;

/**
 * Processes a video file by fragmenting and encrypting it into a single `.ts` file
 * with byte-range fragmentation for HLS playback. This approach ensures standards
 * compliance, reliable playback across HLS-compatible players, and full-file usability
 * when downloaded. Replaces a prior custom implementation that faced browser compatibility issues.
 */
export const processVideoFile = async (
  videoFile: { file: File | Blob; thumbnail?: ThumbnailFile },
  payloadKey: string,
  aesKey?: Uint8Array
): Promise<{
  tinyThumb: EmbeddedThumb | undefined;
  payloads: PayloadFile[];
  thumbnails: ThumbnailFile[];
}> => {
  const keyHeader: KeyHeader | undefined = aesKey ? GenerateKeyHeader(aesKey) : undefined;

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
    ? await createThumbnails(thumbnail, payloadKey, [{ quality: 95, maxPixelDimension: 250, maxBytes: 40 * 1024 }])
    : { tinyThumb: undefined, additionalThumbnails: [] };

  thumbnails.push(...additionalThumbnails);

  // Processing video
  const { metadata, ...videoData } = await segmentVideoFileWithFfmpeg(videoFile.file, keyHeader);

  if ('segments' in videoData) {
    const { segments } = videoData;
    payloads.push({
      key: payloadKey,
      payload: segments,
      descriptorContent: jsonStringify64(metadata),

      ...(keyHeader && keyHeader.iv
        ? { skipEncryption: true, iv: keyHeader.iv }
        : { skipEncryption: false }),
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
