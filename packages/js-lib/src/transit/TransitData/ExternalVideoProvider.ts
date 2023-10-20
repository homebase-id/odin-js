import { DotYouClient } from '../../core/DotYouClient';
import { decryptJsonContent, decryptKeyHeader } from '../../core/DriveData/SecurityHelpers';
import {
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  SystemFileType,
  TargetDrive,
} from '../../core/core';
import { stringifyToQueryParams } from '../../helpers/helpers';

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
  const payload = await getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    undefined,
    systemFileType,
    chunkStart,
    chunkEnd
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
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  // TODO: Decide to use direct urls or not
  const meta = await getFileHeaderOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    systemFileType
  );
  if (!meta.fileMetadata.payloadIsEncrypted) {
    return `https://${odinId}/api/guest/v1/drive/files/payload?${stringifyToQueryParams({
      ...targetDrive,
      fileId,
      xfst: systemFileType || 'Standard',
      iac: true,
    })}`;
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    undefined,
    systemFileType,
    fileSizeLimit ? 0 : undefined,
    fileSizeLimit
  ).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
    return url;
  });
};
