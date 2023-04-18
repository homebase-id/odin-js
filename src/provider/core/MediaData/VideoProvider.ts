import { DotYouClient } from '../DotYouClient';
import { getFileHeader, getPayloadBytes, uploadFile } from '../DriveData/DriveProvider';
import { TargetDrive } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  TransitOptions,
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
  SystemFileType,
} from '../DriveData/DriveUploadTypes';
import { decryptJsonContent, decryptKeyHeader } from '../DriveData/SecurityHelpers';
import { getRandom16ByteArray } from '../DriveData/UploadHelpers';
import { getNewId, jsonStringify64 } from '../helpers/DataUtil';
import { VideoMetadata, VideoUploadResult } from './MediaTypes';

export type VideoContentType = 'video/mp4';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: Uint8Array | File,
  fileMetadata?: VideoMetadata,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
    versionTag?: string;
    type?: VideoContentType;
    transitOptions?: TransitOptions;
    allowDistribution?: boolean;
    userDate?: number;
  }
): Promise<VideoUploadResult | undefined> => {
  if (!targetDrive) {
    throw 'Missing target drive';
  }

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId ?? null,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions || null,
  };

  const metadata: UploadFileMetadata = {
    versionTag: uploadMeta?.versionTag,
    allowDistribution: uploadMeta?.allowDistribution || false,
    contentType: uploadMeta?.type ?? 'image/webp',
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: 0,
      jsonContent: jsonStringify64(fileMetadata),
      userDate: uploadMeta?.userDate,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    file,
    undefined,
    encrypt
  );

  return { fileId: result.file.fileId, type: 'video' };
};

export const getDecryptedVideoChunk = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const length =
    chunkEnd !== undefined && chunkStart !== undefined ? chunkEnd - chunkStart + 1 : undefined;

  const payload = await getPayloadBytes(
    dotYouClient,
    targetDrive,
    fileId,
    undefined,
    systemFileType,
    chunkStart,
    length
  );

  return payload.bytes;
};

export const getDecryptedVideoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, systemFileType);
  const fileMetadata = fileHeader.fileMetadata;

  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
    : undefined;

  return await decryptJsonContent<VideoMetadata>(fileMetadata, keyheader);
};
