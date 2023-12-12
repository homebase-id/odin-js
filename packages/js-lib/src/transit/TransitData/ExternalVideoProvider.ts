import { DotYouClient } from '../../core/DotYouClient';
import { SystemFileType, TargetDrive } from '../../core/core';
import { stringifyToQueryParams, tryJsonParse } from '../../helpers/helpers';
import { PlainVideoMetadata, SegmentedVideoMetadata } from '../../media/media';
import {
  getFileHeaderOverTransitByGlobalTransitId,
  getPayloadBytesOverTransitByGlobalTransitId,
} from '../transit';
import { getFileHeaderOverTransit, getPayloadBytesOverTransit } from './File/TransitFileProvider';

export const getDecryptedVideoChunkOverTransit = async (
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
    ? await getPayloadBytesOverTransitByGlobalTransitId(
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
    : await getPayloadBytesOverTransit(dotYouClient, odinId, targetDrive, fileId, key, {
        systemFileType,
        chunkStart,
        chunkEnd,
      });

  return payload?.bytes || null;
};

export const getDecryptedVideoMetadataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId, {
    systemFileType,
  });
  if (!fileHeader) return undefined;

  const descriptor = fileHeader.fileMetadata.payloads.find((p) => p.key === fileKey)
    ?.descriptorContent;
  if (!descriptor) return undefined;

  return tryJsonParse<PlainVideoMetadata | SegmentedVideoMetadata>(descriptor);
};

export const getDecryptedVideoMetadataOverTransitByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  videoGlobalTransitId: string,
  fileKey: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeaderOverTransitByGlobalTransitId(
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

export const getDecryptedVideoUrlOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const meta = await getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId, {
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
  return getPayloadBytesOverTransit(dotYouClient, odinId, targetDrive, fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
    return url;
  });
};
export const getDecryptedVideoUrlOverTransitByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  videoGlobalTransitId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const meta = await getFileHeaderOverTransitByGlobalTransitId(
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
  return getPayloadBytesOverTransit(dotYouClient, odinId, targetDrive, meta?.fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
    return url;
  });
};
