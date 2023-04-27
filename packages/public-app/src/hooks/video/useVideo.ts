import { useQuery } from '@tanstack/react-query';
import {
  DotYouClient,
  getDecryptedVideoChunk,
  getDecryptedVideoChunkOverTransit,
  getDecryptedVideoMetadata,
  getDecryptedVideoMetadataOverTransit,
  TargetDrive,
  VideoMetadata,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useVideo = (odinId?: string, videoFileId?: string | undefined, videoDrive?: TargetDrive) => {
  const localHost = window.location.hostname;
  const dotYouClient = useAuth().getDotYouClient();

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoDrive?: TargetDrive
  ): Promise<VideoMetadata | null> => {
    if (videoFileId === undefined || videoFileId === '' || !videoDrive) {
      return null;
    }

    const fetchMetaPromise = async () => {
      return odinId !== localHost
        ? await getDecryptedVideoMetadataOverTransit(dotYouClient, odinId, videoDrive, videoFileId)
        : await getDecryptedVideoMetadata(dotYouClient, videoDrive, videoFileId);
    };

    return await fetchMetaPromise();
  };

  return {
    fetchMetadata: useQuery(
      ['video', odinId || localHost, videoDrive?.alias, videoFileId],
      () => fetchVideoData(odinId || localHost, videoFileId, videoDrive),
      {
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        cacheTime: 0,
        enabled: !!videoFileId && videoFileId !== '',
      }
    ),
    getChunk: (chunkStart: number, chunkEnd?: number) => {
      if (!videoFileId || !videoDrive) {
        return null;
      }

      const params = [videoDrive, videoFileId, chunkStart, chunkEnd] as const;
      return odinId && odinId !== localHost
        ? getDecryptedVideoChunkOverTransit(dotYouClient, odinId, ...params)
        : getDecryptedVideoChunk(dotYouClient, ...params);
    },
  };
};

export default useVideo;
