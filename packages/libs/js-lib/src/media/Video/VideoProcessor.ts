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
import { DEFAULT_PAYLOAD_DESCRIPTOR_KEY, MAX_PAYLOAD_DESCRIPTOR_BYTES } from '../../core/constants';

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
  descriptorKey?: string,
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

  // get the metadata size 
  const shouldEmbedContent = jsonStringify64(metadata).length < MAX_PAYLOAD_DESCRIPTOR_BYTES;

  const descriptorContent = shouldEmbedContent ? jsonStringify64(metadata) : jsonStringify64({
    mimeType: metadata.mimeType,
    isSegmented: metadata.isSegmented,
    isDescriptorContentComplete: false,
    fileSize: metadata.fileSize,
    key: descriptorKey || DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
  })

  if ('segments' in videoData) {
    const { segments } = videoData;
    payloads.push({
      key: payloadKey,
      payload: segments,
      descriptorContent: descriptorContent,
      ...(keyHeader && keyHeader.iv
        ? { skipEncryption: true, iv: keyHeader.iv }
        : { skipEncryption: false }),
    });
  } else {
    payloads.push({
      key: payloadKey,
      payload: videoData.video,
      descriptorContent: descriptorContent,
    });
  }

  if (!shouldEmbedContent) {
    payloads.push({
      key: descriptorKey || DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
      payload: new Blob([jsonStringify64(metadata)], { type: 'application/json' }),
      descriptorContent: undefined,
      skipEncryption: false,
    });
  }

  return {
    tinyThumb,
    thumbnails,
    payloads,
  };
};
