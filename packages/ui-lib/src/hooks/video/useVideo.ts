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
  getDecryptedVideoMetadataOverTransitByGlobalTransitId,
  getDecryptedVideoUrlOverTransit,
  getDecryptedVideoUrlOverTransitByGlobalTransitId,
} from '@youfoundation/js-lib/transit';

export const useVideo = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive
) => {
  const localHost = window.location.hostname;

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoGlobalTransitId: string | undefined,
    videoDrive?: TargetDrive
  ): Promise<PlainVideoMetadata | SegmentedVideoMetadata | null> => {
    if (
      videoFileId === undefined ||
      videoFileId === '' ||
      videoFileKey === undefined ||
      videoFileKey === '' ||
      !videoDrive
    ) {
      return null;
    }

    const fetchMetaPromise = async () => {
      return odinId !== localHost
        ? videoGlobalTransitId
          ? await getDecryptedVideoMetadataOverTransitByGlobalTransitId(
              dotYouClient,
              odinId,
              videoDrive,
              videoGlobalTransitId,
              videoFileKey
            )
          : await getDecryptedVideoMetadataOverTransit(
              dotYouClient,
              odinId,
              videoDrive,
              videoFileId,
              videoFileKey
            )
        : await getDecryptedVideoMetadata(dotYouClient, videoDrive, videoFileId, videoFileKey);
    };

    return (await fetchMetaPromise()) || null;
  };

  return {
    fetchMetadata: useQuery({
      queryKey: [
        'video',
        odinId || localHost,
        videoDrive?.alias,
        videoGlobalTransitId || videoFileId,
      ],
      queryFn: () =>
        fetchVideoData(odinId || localHost, videoFileId, videoGlobalTransitId, videoDrive),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
    }),
    getChunk: (chunkStart: number, chunkEnd?: number) => {
      if (!videoFileId || !videoDrive || !videoFileKey) return null;

      const params = [
        videoDrive,
        videoFileId,
        videoGlobalTransitId,
        videoFileKey,
        chunkStart,
        chunkEnd,
      ] as const;
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
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive,
  fileSizeLimit?: number
) => {
  const localHost = window.location.hostname;

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoGlobalTransitId: string | undefined,
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
        ? videoGlobalTransitId
          ? await getDecryptedVideoUrlOverTransitByGlobalTransitId(
              dotYouClient,
              odinId,
              videoDrive,
              videoGlobalTransitId,
              videoFileKey,
              undefined,
              fileSizeLimit
            )
          : await getDecryptedVideoUrlOverTransit(
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
      queryKey: [
        'video-url',
        odinId || localHost,
        videoDrive?.alias,
        videoGlobalTransitId || videoFileId,
      ],
      queryFn: () =>
        fetchVideoData(odinId || localHost, videoFileId, videoGlobalTransitId, videoDrive),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
    }),
  };
};
