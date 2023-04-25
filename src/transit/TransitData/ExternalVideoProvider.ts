import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/DriveData/DriveTypes';
import { SystemFileType } from '../../core/DriveData/DriveUploadTypes';
import { decryptJsonContent, decryptKeyHeader } from '../../core/DriveData/SecurityHelpers';
import { VideoMetadata } from '../../core/MediaData/MediaTypes';
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

  return payload?.bytes;
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

  return await decryptJsonContent<VideoMetadata>(fileMetadata, keyheader);
};
