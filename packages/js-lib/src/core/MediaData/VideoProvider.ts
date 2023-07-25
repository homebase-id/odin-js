import { uint8ArrayToBase64, getNewId, jsonStringify64, stringify } from '../../helpers/DataUtil';
import { DotYouClient } from '../DotYouClient';
import { decryptJsonContent, decryptKeyHeader } from '../DriveData/SecurityHelpers';
import { getRandom16ByteArray } from '../DriveData/UploadHelpers';
import { encryptUrl } from '../InterceptionEncryptionUtil';
import {
  TargetDrive,
  AccessControlList,
  TransitOptions,
  ThumbnailFile,
  SecurityGroupType,
  UploadInstructionSet,
  EmbeddedThumb,
  UploadFileMetadata,
  UploadResult,
  uploadFile,
  SystemFileType,
  getPayloadBytes,
  getFileHeader,
} from '../core';
import { PlainVideoMetadata, SegmentedVideoMetadata, VideoUploadResult } from './MediaTypes';
import { createThumbnails } from './Thumbs/ThumbnailProvider';

export type VideoContentType = 'video/mp4';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: Uint8Array | Blob | File,
  fileMetadata?: PlainVideoMetadata | SegmentedVideoMetadata,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
    versionTag?: string;
    type?: VideoContentType;
    transitOptions?: TransitOptions;
    allowDistribution?: boolean;
    userDate?: number;
    thumb?: ThumbnailFile;
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

  const { naturalSize, tinyThumb, additionalThumbnails } = uploadMeta?.thumb
    ? await createThumbnails(uploadMeta.thumb.payload, uploadMeta.thumb.contentType, [
        { quality: 100, width: 250, height: 250 },
      ])
    : { naturalSize: undefined, tinyThumb: undefined, additionalThumbnails: undefined };

  const previewThumbnail: EmbeddedThumb | undefined =
    naturalSize && tinyThumb
      ? {
          pixelWidth: naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
          pixelHeight: naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
          contentType: tinyThumb.contentType,
          content: uint8ArrayToBase64(tinyThumb.payload),
        }
      : undefined;

  const additionalThumbs = additionalThumbnails?.map((thumb) => {
    return {
      pixelHeight: thumb.pixelHeight,
      pixelWidth: thumb.pixelWidth,
      contentType: thumb.contentType,
    };
  });

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
      jsonContent: fileMetadata ? jsonStringify64(fileMetadata) : null,
      userDate: uploadMeta?.userDate,
      previewThumbnail,
      additionalThumbnails: additionalThumbs,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    file,
    additionalThumbnails,
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

  return payload?.bytes || null;
};

export const getDecryptedVideoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, systemFileType);
  if (!fileHeader) return undefined;
  const fileMetadata = fileHeader.fileMetadata;

  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
    : undefined;

  return await decryptJsonContent<PlainVideoMetadata | SegmentedVideoMetadata>(
    fileMetadata,
    keyheader
  );
};

export const getDecryptedVideoUrl = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const getDirectImageUrl = async () => {
    const directUrl = `${dotYouClient.getEndpoint()}/drive/files/payload?${stringify({
      ...targetDrive,
      fileId,
      xfst: systemFileType || 'Standard',
    })}`;

    if (ss) return await encryptUrl(directUrl, ss);

    return directUrl;
  };

  const ss = dotYouClient.getSharedSecret();

  // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss) {
    return await getDirectImageUrl();
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  // We limit download to 10MB to avoid memory issues
  return getPayloadBytes(
    dotYouClient,
    targetDrive,
    fileId,
    undefined,
    systemFileType,
    0,
    fileSizeLimit
  ).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
    return url;
  });
};
