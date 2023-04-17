import { DotYouClient } from '../DotYouClient';
import { TargetDrive } from '../DriveData/DriveTypes';
import { SystemFileType } from '../DriveData/DriveUploadTypes';
import { decryptJsonContent, decryptKeyHeader } from '../DriveData/SecurityHelpers';
import { VideoMetadata } from '../MediaData/MediaTypes';
import { getFileHeaderOverTransit, getPayloadBytesOverTransit } from './TransitProvider';

export const getDecryptedVideoChunkOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType,
  chunkStart?: number,
  chunkEnd?: number
): Promise<Uint8Array | null> => {
  if (isProbablyEncrypted) {
    throw new Error('getDecryptedVideoChunk is not supported for encrypted videos');
  }

  const length =
    chunkEnd !== undefined && chunkStart !== undefined ? chunkEnd - chunkStart + 1 : undefined;

  const bytes = (
    await getPayloadBytesOverTransit(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      undefined,
      systemFileType,
      chunkStart,
      length
    )
  )?.bytes;

  return bytes;
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
