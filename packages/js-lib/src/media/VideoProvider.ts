import { DotYouClient } from '../core/DotYouClient';
import { TargetDrive, SystemFileType, getPayloadBytes } from '../core/core';
import { getDecryptedMediaUrl } from './MediaProvider';

export type VideoContentType = 'video/mp4';

export const getDecryptedVideoChunk = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  _globalTransitId: string | undefined, // Kept for compatibility with ...OverPeer signature
  key: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
    systemFileType,
    chunkStart,
    chunkEnd,
  });

  return payload?.bytes || null;
};

export const getDecryptedVideoUrl = getDecryptedMediaUrl;
