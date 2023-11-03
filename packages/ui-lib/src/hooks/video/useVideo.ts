import { useQuery } from '@tanstack/react-query';
import {
  DotYouClient,
  getDecryptedVideoChunk,
  getDecryptedVideoMetadata,
  getDecryptedVideoUrl,
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import {
  getDecryptedVideoChunkOverTransit,
  getDecryptedVideoMetadataOverTransit,
  getDecryptedVideoUrlOverTransit,
} from '@youfoundation/js-lib/transit';

export const useVideo = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive
) => {
  const localHost = window.location.hostname;

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoDrive?: TargetDrive
  ): Promise<PlainVideoMetadata | SegmentedVideoMetadata | null> => {
    if (videoFileId === undefined || videoFileId === '' || !videoDrive) {
      return null;
    }

    const fetchMetaPromise = async () => {
      return odinId !== localHost
        ? await getDecryptedVideoMetadataOverTransit(dotYouClient, odinId, videoDrive, videoFileId)
        : await getDecryptedVideoMetadata(dotYouClient, videoDrive, videoFileId);
    };

    return (await fetchMetaPromise()) || null;
  };

  return {
    fetchMetadata: useQuery({
      queryKey: ['video', odinId || localHost, videoDrive?.alias, videoFileId],
      queryFn: () => fetchVideoData(odinId || localHost, videoFileId, videoDrive),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
    }),
    getChunk: (chunkStart: number, chunkEnd?: number) => {
      if (!videoFileId || !videoDrive || !videoFileKey) return null;

      const params = [videoDrive, videoFileId, videoFileKey, chunkStart, chunkEnd] as const;
      return odinId && odinId !== localHost
        ? getDecryptedVideoChunkOverTransit(dotYouClient, odinId, ...params)
        : getDecryptedVideoChunk(dotYouClient, ...params);
    },
  };
};

export const useVideoUrl = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive,
  fileSizeLimit?: number
) => {
  const localHost = window.location.hostname;

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoDrive?: TargetDrive
  ): Promise<string | null> => {
    if (
      videoFileId === undefined ||
      videoFileId === '' ||
      !videoDrive ||
      videoFileKey === undefined ||
      videoFileKey === ''
    )
      return null;

    const fetchMetaPromise = async () => {
      return odinId !== localHost
        ? await getDecryptedVideoUrlOverTransit(
            dotYouClient,
            odinId,
            videoDrive,
            videoFileId,
            videoFileKey,
            undefined,
            fileSizeLimit
          )
        : await getDecryptedVideoUrl(
            dotYouClient,
            videoDrive,
            videoFileId,
            videoFileKey,
            undefined,
            fileSizeLimit
          );
    };

    return await fetchMetaPromise();
  };

  return {
    fetch: useQuery({
      queryKey: ['video-url', odinId || localHost, videoDrive?.alias, videoFileId],
      queryFn: () => fetchVideoData(odinId || localHost, videoFileId, videoDrive),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
    }),
  };
};
