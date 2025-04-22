import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  OdinClient,
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
  odinClient: OdinClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive,
  systemFileType?: SystemFileType,
  lastModified?: number
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
  const identity = odinClient.getHostIdentity();

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
              odinClient,
              odinId,
              videoDrive,
              videoGlobalTransitId,
              { systemFileType }
            )
            : await getFileHeaderOverPeer(odinClient, odinId, videoDrive, videoFileId, {
              systemFileType,
            })
          : await getFileHeader(odinClient, videoDrive, videoFileId, { systemFileType });

      if (!fileHeader) return undefined;
      const payloadData = fileHeader.fileMetadata.payloads?.find((p) => p.key === videoFileKey);
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
        videoFileKey,
      ],
      queryFn: () =>
        fetchVideoData(
          odinId || identity,
          videoFileId,
          videoGlobalTransitId,
          videoDrive,
          systemFileType
        ),
      staleTime: lastModified ? Infinity : 1000 * 60 * 60, // 1 hour
      gcTime: Infinity,
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
        ? getDecryptedVideoChunkOverPeer(odinClient, odinId, ...params)
        : getDecryptedVideoChunk(odinClient, ...params);
    },
  };
};

export const useVideoUrl = (
  odinClient: OdinClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive,
  fileSizeLimit?: number,
  systemFileType?: SystemFileType,
  lastModified?: number
): { fetch: UseQueryResult<string | null, Error> } => {
  const identity = odinClient.getHostIdentity();

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
            odinClient,
            odinId,
            videoDrive,
            videoGlobalTransitId,
            videoFileKey,

            systemFileType,
            fileSizeLimit
          )
          : await getDecryptedVideoUrlOverPeer(
            odinClient,
            odinId,
            videoDrive,
            videoFileId,
            videoFileKey,
            systemFileType,
            fileSizeLimit
          )
        : await getDecryptedVideoUrl(
          odinClient,
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
        videoFileKey,
      ],
      queryFn: () =>
        fetchVideoData(odinId || identity, videoFileId, videoGlobalTransitId, videoDrive),
      staleTime: lastModified ? Infinity : 1000 * 60 * 60, // 1 hour
      enabled: !!videoFileId && videoFileId !== '',
    }),
  };
};
