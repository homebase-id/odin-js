import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  DotYouClient,
  HomebaseFile,
  SystemFileType,
  TargetDrive,
  decryptKeyHeader,
} from '@homebase-id/js-lib/core';
import {
  stringifyToQueryParams,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import { getAnonymousDirectImageUrl } from '@homebase-id/js-lib/media';
import { useVideo } from './useVideo';

export const useHlsManifest = (
  dotYouClient: DotYouClient,
  odinId?: string,
  videoFileId?: string | undefined,
  videoGlobalTransitId?: string | undefined,
  videoFileKey?: string | undefined,
  videoDrive?: TargetDrive,
  systemFileType?: SystemFileType,
  lastModified?: number
): { fetch: UseQueryResult<string | null, Error> } => {
  const identity = dotYouClient.getHostIdentity();
  const { data: videoFileData, isFetched: videoFileDataFetched } = useVideo(
    dotYouClient,
    odinId,
    videoFileId,
    videoGlobalTransitId,
    videoFileKey,
    videoDrive,
    systemFileType,
    lastModified
  ).fetchMetadata;

  const fetchManifest = async (
    odinId: string,
    videoFile: HomebaseFile | undefined,
    videoDrive: TargetDrive | undefined,
    videoFileKey: string | undefined
  ): Promise<string | null> => {
    if (
      !videoFile ||
      videoFileId === undefined ||
      videoFileId === '' ||
      !videoDrive ||
      videoFileKey === undefined ||
      videoFileKey === ''
    )
      return null;

    if (!videoFileData || !('hlsPlaylist' in videoFileData.metadata) || !videoFileData?.metadata)
      return null;

    const contents = await replaceSegmentUrls(
      videoFileData?.metadata.hlsPlaylist,
      async (url) =>
        (await getSegmentUrl(
          dotYouClient,
          odinId,
          videoDrive,
          videoFile.fileId,
          videoFileKey,
          videoFileData?.fileHeader.fileMetadata.isEncrypted || false,
          systemFileType
        )) || url,
      async (url) => {
        if (!videoFileData?.fileHeader.sharedSecretEncryptedKeyHeader) return url;
        const keyHeader = await decryptKeyHeader(
          dotYouClient,
          videoFileData?.fileHeader.sharedSecretEncryptedKeyHeader
        );

        return (await getKeyUrl(keyHeader.aesKey)) || url;
      }
    );

    return `data:application/vnd.apple.mpegurl;base64,${uint8ArrayToBase64(stringToUint8Array(contents))}`;
  };

  return {
    fetch: useQuery({
      queryKey: [
        'video-hls-manifest',
        odinId || identity,
        videoDrive?.alias,
        videoGlobalTransitId || videoFileId,
        videoFileKey,
        lastModified,
      ],
      queryFn: () =>
        fetchManifest(odinId || identity, videoFileData?.fileHeader, videoDrive, videoFileKey),
      staleTime: lastModified ? Infinity : 1000 * 60 * 60 * 1, // 1 hour
      gcTime: Infinity,
      enabled: !!videoFileId && videoFileId !== '' && videoFileDataFetched,
    }),
  };
};

const replaceSegmentUrls = async (
  playlistContent: string,
  replaceFunction: (url: string, index: number) => Promise<string>,
  replaceKeyFunction: (url: string) => Promise<string>
): Promise<string> => {
  // Split the playlist content into lines
  const lines = playlistContent.split('\n');
  const modifiedLines: string[] = [];
  let segmentIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if the line is an encryption key URL
    if (line.startsWith('#EXT-X-KEY:METHOD=AES-128')) {
      // Extract the URI part (key URL)
      const uriRegex = /URI="([^"]+)"/;
      const match = line.match(uriRegex);

      if (match && match[1]) {
        const originalKeyUrl = match[1];
        // Replace the key URL using the provided function
        const newKeyUrl = await replaceKeyFunction(originalKeyUrl);
        // Replace the original URL in the line with the new URL
        modifiedLines.push(line.replace(originalKeyUrl, newKeyUrl));
      }
    }
    // Check if the line is a URL (not a comment or metadata)
    else if (!line.startsWith('#') && line.trim() !== '') {
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

const getSegmentUrl = async (
  dotYouClient: DotYouClient,
  odinId: string,
  videoDrive: TargetDrive,
  videoFileId: string,
  videoFileKey: string,
  isEncrypted: boolean,
  systemFileType?: SystemFileType
) => {
  const identity = dotYouClient.getHostIdentity();
  if (!isEncrypted)
    return await getAnonymousDirectImageUrl(
      odinId || identity,
      videoDrive,
      videoFileId,
      videoFileKey,
      undefined,
      systemFileType
    );

  // Without a shared secret the file's key header can't be opened, so an encrypted video can't play
  if (!dotYouClient.getSharedSecret()) return null;

  // V2 payload reads take no shared secret, so the url is not encrypted; hls.js adds the token as a Bearer header
  // (HlsSource). Segments are byte ranges of one file (ffmpeg's single_file), so the url must honour a Range header:
  // on a local drive that is the ranged route (from 0, length 0 = "to the end"); the peer payload route honours it.
  const filePath = `drives/${videoDrive.alias}/files/${videoFileId}/payload/${videoFileKey}`;
  const query = stringifyToQueryParams({ xfst: systemFileType || 'Standard' });

  return odinId !== identity
    ? `${dotYouClient.getEndpointV2()}/peer/${encodeURIComponent(odinId)}/${filePath}?${query}`
    : `${dotYouClient.getEndpointV2()}/${filePath}/0/0?${query}`;
};

const getKeyUrl = async (aesKey: Uint8Array) => {
  return `data:application/octet-stream;base64,${uint8ArrayToBase64(aesKey)}`;
};
