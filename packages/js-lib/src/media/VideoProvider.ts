import {
  getNewId,
  jsonStringify64,
  stringifyToQueryParams,
  getRandom16ByteArray,
  tryJsonParse,
} from '../helpers/DataUtil';
import { DotYouClient } from '../core/DotYouClient';
import { DEFAULT_PAYLOAD_KEY } from '../core/DriveData/Upload/UploadHelpers';
import { encryptUrl } from '../core/InterceptionEncryptionUtil';
import {
  TargetDrive,
  AccessControlList,
  TransitOptions,
  ThumbnailFile,
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  uploadFile,
  SystemFileType,
  getPayloadBytes,
  getFileHeader,
} from '../core/core';
import { PlainVideoMetadata, SegmentedVideoMetadata, VideoUploadResult } from './MediaTypes';
import { createThumbnails } from './Thumbs/ThumbnailProvider';

export type VideoContentType = 'video/mp4';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: Blob | File,
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
  if (!targetDrive) throw 'Missing target drive';

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions,
  };

  const { tinyThumb, additionalThumbnails } = uploadMeta?.thumb
    ? await createThumbnails(uploadMeta.thumb.payload, DEFAULT_PAYLOAD_KEY, [
        { quality: 100, width: 250, height: 250 },
      ])
    : { tinyThumb: undefined, additionalThumbnails: undefined };

  const metadata: UploadFileMetadata = {
    versionTag: uploadMeta?.versionTag,
    allowDistribution: uploadMeta?.allowDistribution || false,
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      fileType: 0,
      userDate: uploadMeta?.userDate,
      previewThumbnail: tinyThumb,
    },
    isEncrypted: encrypt,
    accessControlList: acl,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    [
      {
        payload: file,
        key: DEFAULT_PAYLOAD_KEY,
        descriptorContent: fileMetadata ? jsonStringify64(fileMetadata) : undefined,
      },
    ],
    additionalThumbnails,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'video',
  };
};

export const getDecryptedVideoChunk = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  _globalTransitId: string | undefined, // Kept for compatibility with ...overTransit signature
  key: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
    systemFileType,
    chunkStart,
    chunkEnd,
  });

  return payload?.bytes || null;
};

export const getDecryptedVideoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string | undefined,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
  if (!fileHeader) return undefined;

  const descriptor = fileHeader.fileMetadata.payloads.find((p) => p.key === fileKey)
    ?.descriptorContent;
  if (!descriptor) return undefined;

  return tryJsonParse<PlainVideoMetadata | SegmentedVideoMetadata>(descriptor);
};

export const getDecryptedVideoUrl = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const getDirectImageUrl = async () => {
    const directUrl = `${dotYouClient.getEndpoint()}/drive/files/payload?${stringifyToQueryParams({
      ...targetDrive,
      fileId,
      key,
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

  const meta = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
  if (!meta?.fileMetadata.isEncrypted) {
    return await getDirectImageUrl();
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  // We limit download to 10MB to avoid memory issues
  return getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
    return url;
  });
};
