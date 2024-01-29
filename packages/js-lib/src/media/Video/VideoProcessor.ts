import { jsonStringify64 } from '../../helpers/DataUtil';
import {
  EmbeddedThumb,
  PayloadFile,
  ThumbnailFile,
} from '../../core/DriveData/File/DriveFileTypes';
import { createThumbnails } from '../Thumbs/ThumbnailProvider';
import { segmentVideoFileWithFfmpeg, getThumbnailWithFfmpeg } from './VideoSegmenterFfmpeg';

const megaByte = 1024 * 1024;

export const processVideoFile = async (
  videoFile: { file: File | Blob; thumbnail?: ThumbnailFile },
  payloadKey: string
): Promise<{
  payload: PayloadFile;
  tinyThumb: EmbeddedThumb | undefined;
  additionalThumbnails: ThumbnailFile[];
}> => {
  const thumbnail = await (async () => {
    const passedThumbnail = 'thumbnail' in videoFile ? videoFile.thumbnail?.payload : undefined;

    // Safari is bad at grabbing a thumbnail from a video preview and can give a blank image
    if (!passedThumbnail || passedThumbnail?.size < 1 * megaByte) {
      try {
        return (await getThumbnailWithFfmpeg(videoFile.file)) || passedThumbnail;
      } catch (e) {
        // Ignore; Grabbing can fail (it's not that important)
      }
    }

    return passedThumbnail;
  })();

  const { tinyThumb, additionalThumbnails } = thumbnail
    ? await createThumbnails(thumbnail, payloadKey, [{ quality: 100, width: 250, height: 250 }])
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
