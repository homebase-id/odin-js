import { OdinClient } from '../core/OdinClient';
import { TargetDrive, SystemFileType, getPayloadBytes } from '../core/core';
import { getDecryptedMediaUrl } from './MediaProvider';

export type VideoContentType = 'video/mp4';

export const getDecryptedVideoChunk = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  fileId: string,
  _globalTransitId: string | undefined, // Kept for compatibility with ...OverPeer signature
  key: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const payload = await getPayloadBytes(odinClient, targetDrive, fileId, key, {
    systemFileType,
    chunkStart,
    chunkEnd,
  });

  return payload?.bytes || null;
};

export const getDecryptedVideoUrl = getDecryptedMediaUrl;
