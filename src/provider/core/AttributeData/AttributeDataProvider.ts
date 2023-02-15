import { Attribute, AttributeFile } from './AttributeDataTypes';

import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../DriveData/DriveTypes';

import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../DriveData/DriveUploadTypes';
import { DataUtil } from '../DataUtil';
import { AttributeConfig } from './AttributeConfig';
import { ProfileConfig } from '../../profile/ProfileConfig';
import { DotYouClient } from '../DotYouClient';
import { DeleteFile, GetPayload, QueryBatch, Random16, Upload } from '../DriveData/DriveProvider';

//Gets all attributes for a given profile.  if sectionId is defined, only attributes matching that section are returned.
export const getProfileAttributes = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string | undefined,
  pageSize: number
): Promise<AttributeFile[]> => {
  const targetDrive = getTargetDrive(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    groupId: sectionId ? [sectionId] : undefined,
  };

  const result = await QueryBatch(dotYouClient, qp, {
    maxRecords: pageSize,
    includeMetadataHeader: true, // Set to true to allow jsonContent to be there, and we don't need extra calls to get the header with jsonContent
  });

  let attributes: AttributeFile[] = await Promise.all(
    result.searchResults.map(async (dsr) =>
      dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
    )
  );

  //sort where lowest number is higher priority
  attributes = attributes.sort((a, b) => {
    return a.priority - b.priority;
  });

  return attributes;
};

//gets all versions of an attribute available to the caller
export const getAttributeVersions = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string | undefined,
  tags: string[]
): Promise<AttributeFile[] | undefined> => {
  const targetDrive = getTargetDrive(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    groupId: sectionId ? [sectionId] : undefined,
    tagsMatchAtLeastOne: tags,
  };

  const result = await QueryBatch(dotYouClient, qp, {
    maxRecords: 10,
    includeMetadataHeader: true,
  });

  let attributes: AttributeFile[] = await Promise.all(
    result.searchResults.map(async (dsr) =>
      dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
    )
  );

  //sort where lowest number is higher priority (!! sort happens in place)
  attributes = attributes.sort((a, b) => {
    return a.priority - b.priority;
  });

  return attributes;
};

export const getAttribute = async (
  dotYouClient: DotYouClient,
  profileId: string,
  id: string
): Promise<AttributeFile | undefined> => {
  const targetDrive = getTargetDrive(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    clientUniqueIdAtLeastOne: [id],
    fileType: [AttributeConfig.AttributeFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  const result = await QueryBatch(dotYouClient, qp, ro);

  if (result.searchResults.length == 0) {
    return;
  }

  if (result.searchResults.length > 1) {
    console.warn(
      `Attribute Id [${id}] in profile [${profileId}] has more than one file. Using latest`
    );
  }

  const dsr: DriveSearchResult = result.searchResults[0];
  return dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader);
};

export const getAttributes = async (
  dotYouClient: DotYouClient,
  profileId: string,
  tags: string[] | undefined,
  pageSize: number
): Promise<AttributeFile[]> => {
  const targetDrive = getTargetDrive(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    tagsMatchAll: tags ?? undefined,
  };

  const result = await QueryBatch(dotYouClient, qp, {
    maxRecords: pageSize,
    includeMetadataHeader: true,
  });

  let attributes: AttributeFile[] = await Promise.all(
    result.searchResults.map(async (dsr) =>
      dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
    )
  );

  //sort where lowest number is higher priority
  attributes = attributes.sort((a, b) => {
    return a.priority - b.priority;
  });

  return attributes;
};

export const dsrToAttributeFile = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<AttributeFile> => {
  const attrPayload = await GetPayload<AttributeFile>(
    dotYouClient,
    targetDrive,
    dsr.fileId,
    dsr.fileMetadata,
    dsr.sharedSecretEncryptedKeyHeader,
    includeMetadataHeader
  );
  return {
    ...attrPayload,
    fileId: attrPayload.fileId ?? dsr.fileId,
    acl: dsr.serverMetadata?.accessControlList,
  };
};

export const saveAttribute = async (
  dotYouClient: DotYouClient,
  attribute: AttributeFile
): Promise<AttributeFile> => {
  // If a new attribute
  if (!attribute.id) {
    attribute.id = DataUtil.getNewId();
  } else if (!attribute.fileId) {
    attribute.fileId =
      (await getAttribute(dotYouClient, attribute.profileId, attribute.id))?.fileId ?? undefined;
  }

  const encrypt = !(
    attribute.acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    attribute.acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  if (!attribute.id || !attribute.profileId || !attribute.type || !attribute.sectionId) {
    throw 'Attribute is missing id, profileId, sectionId, or type';
  }

  const instructionSet: UploadInstructionSet = {
    transferIv: Random16(),
    storageOptions: {
      overwriteFileId: attribute?.fileId ?? '',
      drive: getTargetDrive(attribute.profileId),
    },
    transitOptions: null,
  };

  const payloadJson: string = DataUtil.JsonStringify64({
    ...attribute,
    acl: undefined,
    fileId: undefined,
  } as Attribute);
  const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    contentType: 'application/json',
    appData: {
      uniqueId: attribute.id,
      tags: [attribute.type, attribute.sectionId, attribute.profileId, attribute.id],
      groupId: attribute.sectionId,
      fileType: AttributeConfig.AttributeFileType,
      contentIsComplete: shouldEmbedContent,
      jsonContent: shouldEmbedContent ? payloadJson : null,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: attribute.acl,
  };

  const result: UploadResult = await Upload(
    dotYouClient,
    instructionSet,
    metadata,
    payloadBytes,
    undefined,
    encrypt
  );

  //update server-side info
  attribute.fileId = result.file.fileId;
  return attribute;
};

export const removeAttribute = async (
  dotYouClient: DotYouClient,
  profileId: string,
  attributeFileId: string
): Promise<void> => {
  const targetDrive = getTargetDrive(profileId);
  DeleteFile(dotYouClient, targetDrive, attributeFileId);
};

const getTargetDrive = (profileId: string) => {
  return {
    alias: profileId,
    type: ProfileConfig.ProfileDriveType,
  };
};
