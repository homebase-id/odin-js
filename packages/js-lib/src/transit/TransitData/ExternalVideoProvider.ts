import { DotYouClient } from '../../core/DotYouClient';
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
  key: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const payload = await getPayloadBytesOverTransit(dotYouClient, odinId, targetDrive, fileId, key, {
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
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeaderOverTransit<PlainVideoMetadata | SegmentedVideoMetadata>(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    {
      systemFileType,
    }
  );
  if (!fileHeader) return undefined;
  return fileHeader.fileMetadata.appData.content;
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
  // TODO: Decide to use direct urls or not
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
