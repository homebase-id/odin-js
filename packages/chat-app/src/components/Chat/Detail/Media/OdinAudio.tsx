import { useQuery } from '@tanstack/react-query';
import {
  TargetDrive,
  SystemFileType,
  DotYouClient,
  getPayloadBytes,
} from '@youfoundation/js-lib/core';
import { getDecryptedMediaUrl } from '@youfoundation/js-lib/media';
import {
  getDecryptedMediaUrlOverPeer,
  getDecryptedMediaUrlOverPeerByGlobalTransitId,
  getPayloadBytesOverPeer,
  getPayloadBytesOverPeerByGlobalTransitId,
} from '@youfoundation/js-lib/peer';
import { useMemo } from 'react';

export interface AudioSource {
  odinId?: string;
  targetDrive: TargetDrive;

  // File
  fileId: string | undefined;
  globalTransitId?: string | undefined;

  // Payload
  fileKey: string | undefined;

  // File params
  systemFileType?: SystemFileType;
  lastModified?: number;
}

export interface OdinAudioProps
  extends AudioSource,
    React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> {
  probablyEncrypted?: boolean;
  dotYouClient: DotYouClient;
}

export const OdinAudio = (props: OdinAudioProps) => {
  const {
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    systemFileType,
    probablyEncrypted,
    lastModified,

    ...elementProps
  } = props;
  const { data: audioUrl } = useAudio(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    probablyEncrypted,
    systemFileType,
    lastModified
  ).fetchUrl;

  return (
    <audio
      src={audioUrl || undefined}
      controls
      {...elementProps}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

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
) => {
  const localHost = dotYouClient.getIdentity() || window.location.hostname;

  const fetchAudioData = async (
    odinId: string,
    fileId: string | undefined,
    globalTransitId: string | undefined,
    fileKey: string | undefined,
    drive?: TargetDrive,
    probablyEncrypted?: boolean
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
      queryFn: () =>
        fetchAudioData(
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
  };
};
