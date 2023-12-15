const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
import { DotYouClient } from '../../core/DotYouClient';
import { SystemFileType, TargetDrive } from '../../core/core';
import { stringifyToQueryParams, tryJsonParse } from '../../helpers/helpers';
import { PlainVideoMetadata, SegmentedVideoMetadata } from '../../media/media';
import {
  getFileHeaderOverPeerByGlobalTransitId,
  getPayloadBytesOverPeerByGlobalTransitId,
} from '../peer';
import { getFileHeaderOverPeer, getPayloadBytesOverPeer } from './File/PeerFileProvider';

export const getDecryptedVideoChunkOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  globalTransitId: string | undefined,
  key: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const payload = globalTransitId
    ? await getPayloadBytesOverPeerByGlobalTransitId(
        dotYouClient,
        odinId,
        targetDrive,
        globalTransitId,
        key,
        {
          systemFileType,
          chunkStart,
          chunkEnd,
        }
      )
    : await getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, key, {
        systemFileType,
        chunkStart,
        chunkEnd,
      });

  return payload?.bytes || null;
};

export const getDecryptedVideoMetadataOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, {
    systemFileType,
  });
  if (!fileHeader) return undefined;

  const descriptor = fileHeader.fileMetadata.payloads.find((p) => p.key === fileKey)
    ?.descriptorContent;
  if (!descriptor) return undefined;

  return tryJsonParse<PlainVideoMetadata | SegmentedVideoMetadata>(descriptor);
};

export const getDecryptedVideoMetadataOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  videoGlobalTransitId: string,
  fileKey: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeaderOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    videoGlobalTransitId,
    {
      systemFileType,
    }
  );
  if (!fileHeader) return undefined;

  const descriptor = fileHeader.fileMetadata.payloads.find((p) => p.key === fileKey)
    ?.descriptorContent;
  if (!descriptor) return undefined;

  return tryJsonParse<PlainVideoMetadata | SegmentedVideoMetadata>(descriptor);
};

export const getDecryptedVideoUrlOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const meta = await getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, {
    systemFileType,
  });
  if (!meta?.fileMetadata.isEncrypted) {
    return `https://${odinId}/api/guest/v1/drive/files/payload?${stringifyToQueryParams({
      ...targetDrive,
      fileId,
      key,
      xfst: systemFileType || 'Standard',
      iac: true,
    })}`;
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new OdinBlob([data.bytes], { type: data.contentType }));
    return url;
  });
};
export const getDecryptedVideoUrlOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  videoGlobalTransitId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const meta = await getFileHeaderOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    videoGlobalTransitId,
    {
      systemFileType,
    }
  );
  if (!meta?.fileMetadata.isEncrypted) {
    return `https://${odinId}/api/guest/v1/drive/files/payload?${stringifyToQueryParams({
      ...targetDrive,
      fileId: meta?.fileId,
      key,
      xfst: systemFileType || 'Standard',
      iac: true,
    })}`;
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, meta?.fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new OdinBlob([data.bytes], { type: data.contentType }));
    return url;
  });
};
