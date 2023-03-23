import { DotYouClient } from '../DotYouClient';
import { getRandom16ByteArray, uploadFile } from '../DriveData/DriveProvider';
import { TargetDrive } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  TransitOptions,
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
} from '../DriveData/DriveUploadTypes';
import { getNewId } from '../helpers/DataUtil';
import { VideoUploadResult } from './MediaTypes';

export type VideoContentType = 'video/mp4';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: File,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
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
    allowDistribution: uploadMeta?.allowDistribution || false,
    contentType: uploadMeta?.type ?? 'image/webp',
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: 0,
      jsonContent: null,
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
