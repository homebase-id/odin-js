import { jsonStringify64 } from '../../helpers/DataUtil';
import {
  EmbeddedThumb,
  PayloadFile,
  ThumbnailFile,
} from '../../core/DriveData/File/DriveFileTypes';
import { createThumbnails } from '../Thumbs/ThumbnailProvider';
import { segmentVideoFileWithFfmpeg } from './VideoSegmenterFfmpeg';

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

  const { data: segmentedVideoData, metadata } = await segmentVideoFileWithFfmpeg(videoFile.file);
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
