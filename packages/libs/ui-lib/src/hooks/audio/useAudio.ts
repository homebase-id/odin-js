import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  TargetDrive,
  SystemFileType,
  DotYouClient,
  getPayloadBytes,
} from '@homebase-id/js-lib/core';
import { getDecryptedMediaUrl } from '@homebase-id/js-lib/media';
import {
  getDecryptedMediaUrlOverPeer,
  getDecryptedMediaUrlOverPeerByGlobalTransitId,
  getPayloadBytesOverPeer,
  getPayloadBytesOverPeerByGlobalTransitId,
} from '@homebase-id/js-lib/peer';

export const useAudio = (
  dotYouClient: DotYouClient,
  odinId?: string,
  fileId?: string | undefined,
  globalTransitId?: string | undefined,
  fileKey?: string | undefined,
  drive?: TargetDrive,

  probablyEncrypted?: boolean,

  systemFileType?: SystemFileType,
  lastModified?: number
): {
  fetchUrl: UseQueryResult<string | null, Error>;
  fetch: UseQueryResult<{ bytes: Uint8Array; contentType: string } | null, Error>;
} => {
  const localHost = dotYouClient.getIdentity() || window.location.hostname;

  const fetchAudioData = async (
    odinId: string,
    fileId: string | undefined,
    globalTransitId: string | undefined,
    fileKey: string | undefined,
    drive?: TargetDrive
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> => {
    if (fileId === undefined || fileId === '' || !drive || fileKey === undefined || fileKey === '')
      return null;

    return odinId !== localHost
      ? globalTransitId
        ? await getPayloadBytesOverPeerByGlobalTransitId(
            dotYouClient,
            odinId,
            drive,
            globalTransitId,
            fileKey,
            {
              systemFileType,
              lastModified,
            }
          )
        : await getPayloadBytesOverPeer(dotYouClient, odinId, drive, fileId, fileKey, {
            systemFileType,
            lastModified,
          })
      : await getPayloadBytes(dotYouClient, drive, fileId, fileKey, {
          systemFileType,
          lastModified,
        });
  };

  const fetchAudioUrl = async (
    odinId: string,
    fileId: string | undefined,
    globalTransitId: string | undefined,
    fileKey: string | undefined,
    drive?: TargetDrive,
    probablyEncrypted?: boolean
  ): Promise<string | null> => {
    if (fileId === undefined || fileId === '' || !drive || fileKey === undefined || fileKey === '')
      return null;

    return odinId !== localHost
      ? globalTransitId
        ? await getDecryptedMediaUrlOverPeerByGlobalTransitId(
            dotYouClient,
            odinId,
            drive,
            globalTransitId,
            fileKey,
            probablyEncrypted,
            lastModified,
            {
              systemFileType,
            }
          )
        : await getDecryptedMediaUrlOverPeer(
            dotYouClient,
            odinId,
            drive,
            fileId,
            fileKey,
            probablyEncrypted,
            lastModified,
            {
              systemFileType,
            }
          )
      : await getDecryptedMediaUrl(
          dotYouClient,
          drive,
          fileId,
          fileKey,
          probablyEncrypted,
          lastModified,
          {
            systemFileType,
          }
        );
  };

  return {
    fetchUrl: useQuery({
      queryKey: [
        'audio-url',
        odinId || localHost,
        drive?.alias,
        globalTransitId || fileId,
        fileKey,
      ],
      queryFn: () =>
        fetchAudioUrl(
          odinId || localHost,
          fileId,
          globalTransitId,
          fileKey,
          drive,
          probablyEncrypted
        ),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 min
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      enabled: !!fileId && fileId !== '' && !!drive && !!fileKey,
    }),
    fetch: useQuery({
      queryKey: ['audio', odinId || localHost, drive?.alias, globalTransitId || fileId, fileKey],
      queryFn: () => fetchAudioData(odinId || localHost, fileId, globalTransitId, fileKey, drive),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 min
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      enabled: !!fileId && fileId !== '' && !!drive && !!fileKey,
    }),
  };
};
