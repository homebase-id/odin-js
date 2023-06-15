import { DotYouClient } from '../../core/DotYouClient';
import { decryptJsonContent, decryptKeyHeader } from '../../core/DriveData/SecurityHelpers';
import {
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  SystemFileType,
  TargetDrive,
} from '../../core/core';
import { stringify } from '../../helpers/helpers';

import { getFileHeaderOverTransit, getPayloadBytesOverTransit } from './TransitProvider';

export const getDecryptedVideoChunkOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const length =
    chunkEnd !== undefined && chunkStart !== undefined ? chunkEnd - chunkStart + 1 : undefined;

  const payload = await getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    undefined,
    systemFileType,
    chunkStart,
    length
  );

  return payload?.bytes || null;
};

export const getDecryptedVideoMetadataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeaderOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    systemFileType
  );
  const fileMetadata = fileHeader.fileMetadata;

  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
    : undefined;

  return await decryptJsonContent<PlainVideoMetadata | SegmentedVideoMetadata>(
    fileMetadata,
    keyheader
  );
};

export const getDecryptedVideoUrlOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<string> => {
  const meta = await getFileHeaderOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    systemFileType
  );
  if (!meta.fileMetadata.payloadIsEncrypted) {
    return `https://api.${odinId}/api/youauth/v1/drive/files/payload?${stringify({
      ...targetDrive,
      fileId,
      xfst: systemFileType || 'Standard',
    })}`;
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    undefined,
    systemFileType
  ).then((data) => {
    if (!data) return '';
    const url = window.URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
    return url;
  });
};
