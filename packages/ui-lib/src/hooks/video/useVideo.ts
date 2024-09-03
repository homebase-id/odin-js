import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  DotYouClient,
  HomebaseFile,
  TargetDrive,
  getFileHeader,
  getPayloadBytes,
} from '@homebase-id/js-lib/core';
import { stringToUint8Array, tryJsonParse, uint8ArrayToBase64 } from '@homebase-id/js-lib/helpers';
import {
  getDecryptedMediaUrl,
  getDecryptedVideoChunk,
  getDecryptedVideoUrl,
  PlainVideoMetadata,
  SegmentedVideoMetadata,
} from '@homebase-id/js-lib/media';
import {
  getDecryptedVideoChunkOverPeer,
  getDecryptedVideoUrlOverPeer,
  getDecryptedVideoUrlOverPeerByGlobalTransitId,
  getFileHeaderBytesOverPeerByGlobalTransitId,
  getFileHeaderOverPeer,
  getPayloadBytesOverPeer,
  getPayloadBytesOverPeerByGlobalTransitId,
} from '@homebase-id/js-lib/peer';

export const useVideo = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive
): {
  fetchMetadata: UseQueryResult<
    {
      fileHeader: HomebaseFile;
      metadata: PlainVideoMetadata | SegmentedVideoMetadata;
    } | null,
    Error
  >;
  getChunk: (chunkStart: number, chunkEnd?: number) => Promise<Uint8Array | null> | null;
} => {
  const localHost = window.location.hostname;

  const fetchVideoData = async (
    odinId: string,
    videoFileId: string | undefined,
    videoGlobalTransitId: string | undefined,
    videoDrive?: TargetDrive
  ): Promise<{
    fileHeader: HomebaseFile;
    metadata: PlainVideoMetadata | SegmentedVideoMetadata;
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
        odinId !== localHost
          ? videoGlobalTransitId
            ? await getFileHeaderBytesOverPeerByGlobalTransitId(
                dotYouClient,
                odinId,
                videoDrive,
                videoGlobalTransitId
              )
            : await getFileHeaderOverPeer(dotYouClient, odinId, videoDrive, videoFileId)
          : await getFileHeader(dotYouClient, videoDrive, videoFileId);

      if (!fileHeader) return undefined;
      const payloadData = fileHeader.fileMetadata.payloads.find((p) => p.key === videoFileKey);
      const descriptor = payloadData?.descriptorContent;
      if (!descriptor) return undefined;

      const parsedMetaData = tryJsonParse<PlainVideoMetadata | SegmentedVideoMetadata>(descriptor);
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
  fileSizeLimit?: number
): { fetch: UseQueryResult<string | null, Error> } => {
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

    const fetchUrl = async () => {
      return odinId !== localHost
        ? videoGlobalTransitId
          ? await getDecryptedVideoUrlOverPeerByGlobalTransitId(
              dotYouClient,
              odinId,
              videoDrive,
              videoGlobalTransitId,
              videoFileKey,
              undefined,
              fileSizeLimit
            )
          : await getDecryptedVideoUrlOverPeer(
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

    return await fetchUrl();
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

export const useHlsManifest = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive
): { fetch: UseQueryResult<string | null, Error> } => {
  const localHost = window.location.hostname;

  const fetchManifest = async (
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

    const fetchManifestPayload = async () => {
      return odinId !== localHost
        ? videoGlobalTransitId
          ? await getPayloadBytesOverPeerByGlobalTransitId(
              dotYouClient,
              odinId,
              videoDrive,
              videoGlobalTransitId,
              videoFileKey
            )
          : await getPayloadBytesOverPeer(
              dotYouClient,
              odinId,
              videoDrive,
              videoFileId,
              videoFileKey
            )
        : await getPayloadBytes(dotYouClient, videoDrive, videoFileId, videoFileKey);
    };

    const manifestPayload = await fetchManifestPayload();
    if (!manifestPayload) return null;
    const manifestBlob = new Blob([manifestPayload.bytes], {
      type: 'application/vnd.apple.mpegurl',
    });

    const contents = await replaceSegmentUrls(await manifestBlob.text(), async (url, index) => {
      return (
        (await getDecryptedMediaUrl(
          dotYouClient,
          videoDrive,
          videoFileId,
          videoFileKey,
          undefined,
          undefined,
          { size: { pixelHeight: index, pixelWidth: index } }
        )) || url
      );
    });
    console.log('m3u8', contents);

    // Convert contents to data uri
    const dataUri = `data:application/vnd.apple.mpegurl;base64,${uint8ArrayToBase64(stringToUint8Array(contents))}`;
    return dataUri;
  };

  return {
    fetch: useQuery({
      queryKey: [
        'video-hls-manifest',
        odinId || localHost,
        videoDrive?.alias,
        videoGlobalTransitId || videoFileId,
      ],
      queryFn: () =>
        fetchManifest(odinId || localHost, videoFileId, videoGlobalTransitId, videoDrive),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
    }),
  };
};

/**
 * Replace URLs in an M3U8 playlist.
 * @param {string} playlistContent - The content of the M3U8 playlist.
 * @param {function} replaceFunction - A function that takes the original URL and returns the new URL.
 * @returns {string} - The modified M3U8 playlist content.
 */
const replaceSegmentUrls = async (
  playlistContent: string,
  replaceFunction: (url: string, index: number) => Promise<string>
): Promise<string> => {
  // Split the playlist content into lines
  const lines = playlistContent.split('\n');
  const modifiedLines: string[] = [];
  let segmentIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if the line is a URL (not a comment or metadata)
    if (!line.startsWith('#') && line.trim() !== '') {
      // Use the replaceFunction to replace the URL
      const newUrl = await replaceFunction(line.trim(), segmentIndex);
      segmentIndex++;
      modifiedLines.push(newUrl);
    } else {
      // Return the line unchanged if it's a comment or metadata
      modifiedLines.push(line);
    }
  }

  // Join the modified lines back into a single string
  const modifiedPlaylistContent = modifiedLines.join('\n');
  return modifiedPlaylistContent;
};
