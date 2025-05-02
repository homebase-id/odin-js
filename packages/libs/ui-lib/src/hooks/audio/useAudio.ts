import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  TargetDrive,
  SystemFileType,
  OdinClient,
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
  odinClient: OdinClient,
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
  const localHost = odinClient.getHostIdentity();

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
          odinClient,
          odinId,
          drive,
          globalTransitId,
          fileKey,
          {
            systemFileType,
            lastModified,
          }
        )
        : await getPayloadBytesOverPeer(odinClient, odinId, drive, fileId, fileKey, {
          systemFileType,
          lastModified,
        })
      : await getPayloadBytes(odinClient, drive, fileId, fileKey, {
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
          odinClient,
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
          odinClient,
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
        odinClient,
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
