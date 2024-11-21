import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  DotYouClient,
  HomebaseFile,
  SystemFileType,
  TargetDrive,
  getFileHeader,
} from '@homebase-id/js-lib/core';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';
import {
  getDecryptedVideoChunk,
  getDecryptedVideoUrl,
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  HlsVideoMetadata,
} from '@homebase-id/js-lib/media';
import {
  getDecryptedVideoChunkOverPeer,
  getDecryptedVideoUrlOverPeer,
  getDecryptedVideoUrlOverPeerByGlobalTransitId,
  getFileHeaderBytesOverPeerByGlobalTransitId,
  getFileHeaderOverPeer,
} from '@homebase-id/js-lib/peer';

export const useVideo = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive,
  systemFileType?: SystemFileType
): {
  fetchMetadata: UseQueryResult<
    {
      fileHeader: HomebaseFile;
      metadata: PlainVideoMetadata | SegmentedVideoMetadata | HlsVideoMetadata;
    } | null,
    Error
  >;
  getChunk: (chunkStart: number, chunkEnd?: number) => Promise<Uint8Array | null> | null;
} => {
  const identity = dotYouClient.getHostIdentity();

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoGlobalTransitId: string | undefined,
    videoDrive?: TargetDrive,
    systemFileType?: SystemFileType
  ): Promise<{
    fileHeader: HomebaseFile;
    metadata: PlainVideoMetadata | SegmentedVideoMetadata | HlsVideoMetadata;
  } | null> => {
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
      const fileHeader =
        odinId !== identity
          ? videoGlobalTransitId
            ? await getFileHeaderBytesOverPeerByGlobalTransitId(
                dotYouClient,
                odinId,
                videoDrive,
                videoGlobalTransitId,
                { systemFileType }
              )
            : await getFileHeaderOverPeer(dotYouClient, odinId, videoDrive, videoFileId, {
                systemFileType,
              })
          : await getFileHeader(dotYouClient, videoDrive, videoFileId, { systemFileType });

      if (!fileHeader) return undefined;
      const payloadData = fileHeader.fileMetadata.payloads.find((p) => p.key === videoFileKey);
      const descriptor = payloadData?.descriptorContent;
      if (!descriptor) return undefined;

      const parsedMetaData = tryJsonParse<
        PlainVideoMetadata | SegmentedVideoMetadata | HlsVideoMetadata
      >(descriptor);
      // The fileHeader contains the most accurate file size; So we use that one.
      parsedMetaData.fileSize = payloadData.bytesWritten;
      return { metadata: parsedMetaData, fileHeader };
    };

    return (await fetchMetaPromise()) || null;
  };

  return {
    fetchMetadata: useQuery({
      queryKey: [
        'video',
        odinId || identity,
        videoDrive?.alias,
        videoGlobalTransitId || videoFileId,
      ],
      queryFn: () =>
        fetchVideoData(
          odinId || identity,
          videoFileId,
          videoGlobalTransitId,
          videoDrive,
          systemFileType
        ),
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
        systemFileType,
      ] as const;
      return odinId && odinId !== identity
        ? getDecryptedVideoChunkOverPeer(dotYouClient, odinId, ...params)
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
  fileSizeLimit?: number,
  systemFileType?: SystemFileType
): { fetch: UseQueryResult<string | null, Error> } => {
  const identity = dotYouClient.getHostIdentity();

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

    const fetchUrl = async () => {
      return odinId !== identity
        ? videoGlobalTransitId
          ? await getDecryptedVideoUrlOverPeerByGlobalTransitId(
              dotYouClient,
              odinId,
              videoDrive,
              videoGlobalTransitId,
              videoFileKey,

              systemFileType,
              fileSizeLimit
            )
          : await getDecryptedVideoUrlOverPeer(
              dotYouClient,
              odinId,
              videoDrive,
              videoFileId,
              videoFileKey,
              systemFileType,
              fileSizeLimit
            )
        : await getDecryptedVideoUrl(
            dotYouClient,
            videoDrive,
            videoFileId,
            videoFileKey,
            undefined,
            fileSizeLimit,
            { systemFileType }
          );
    };

    return await fetchUrl();
  };

  return {
    fetch: useQuery({
      queryKey: [
        'video-url',
        odinId || identity,
        videoDrive?.alias,
        videoGlobalTransitId || videoFileId,
      ],
      queryFn: () =>
        fetchVideoData(odinId || identity, videoFileId, videoGlobalTransitId, videoDrive),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
    }),
  };
};
