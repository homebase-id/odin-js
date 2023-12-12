import { jsonStringify64 } from '../../helpers/DataUtil';
import {
  EmbeddedThumb,
  PayloadFile,
  ThumbnailFile,
} from '../../core/DriveData/File/DriveFileTypes';
import { createThumbnails } from '../Thumbs/ThumbnailProvider';
import { segmentVideoFile } from './VideoSegmenter';

export const processVideoFile = async (
  videoFile: { file: File | Blob; thumbnail?: ThumbnailFile },
  payloadKey: string
): Promise<{
  payload: PayloadFile;
  tinyThumb: EmbeddedThumb | undefined;
  additionalThumbnails: ThumbnailFile[];
}> => {
  const { tinyThumb, additionalThumbnails } =
    'thumbnail' in videoFile && videoFile.thumbnail?.payload
      ? await createThumbnails(videoFile.thumbnail.payload, payloadKey, [
          { quality: 100, width: 250, height: 250 },
        ])
      : { tinyThumb: undefined, additionalThumbnails: [] };

  if (videoFile.file.size < 10000000 || 'bytes' in videoFile.file) {
    return {
      tinyThumb,
      additionalThumbnails,
      payload: {
        payload: videoFile.file,
        key: payloadKey,
      },
    };
  }

  const { data: segmentedVideoData, metadata } = await segmentVideoFile(videoFile.file);
  return {
    tinyThumb,
    additionalThumbnails,
    payload: {
      payload: segmentedVideoData,
      descriptorContent: jsonStringify64(metadata),
      key: payloadKey,
    },
  };
};
