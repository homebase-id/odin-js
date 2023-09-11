import { DotYouClient } from '../../core/DotYouClient';
import {
  FileQueryParams,
  queryBatch,
  GetBatchQueryResultOptions,
  DriveSearchResult,
  TargetDrive,
  getPayload,
  SecurityGroupType,
  UploadInstructionSet,
  getRandom16ByteArray,
  UploadFileMetadata,
  UploadResult,
  uploadFile,
  deleteFile,
  AccessControlList,
  getDecryptedImageData,
  getFileHeader,
  uploadImage,
} from '../../core/core';
import {
  aclEqual,
  getDisplayNameOfNameAttribute,
  getNewId,
  jsonStringify64,
  stringToUint8Array,
} from '../../helpers/helpers';
import { HomePageAttributes, HomePageFields, HomePageThemeFields } from '../../public/public';
import { GetTargetDriveFromProfileId, MinimalProfileFields } from '../profile';
import { AttributeConfig, BuiltInAttributes } from './AttributeConfig';
import { AttributeFile, Attribute } from './AttributeDataTypes';

//Gets all attributes for a given profile.  if sectionId is defined, only attributes matching that section are returned.
export const getProfileAttributes = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string | undefined,
  pageSize: number
): Promise<AttributeFile[]> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    groupId: sectionId ? [sectionId] : undefined,
  };

  const result = await queryBatch(dotYouClient, qp, {
    maxRecords: pageSize,
    includeMetadataHeader: true, // Set to true to allow jsonContent to be there, and we don't need extra calls to get the header with jsonContent
  });

  let attributes: AttributeFile[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as AttributeFile[];

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
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    groupId: sectionId ? [sectionId] : undefined,
    tagsMatchAtLeastOne: tags,
  };

  const result = await queryBatch(dotYouClient, qp, {
    maxRecords: 10,
    includeMetadataHeader: true,
  });

  let attributes: AttributeFile[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as AttributeFile[];

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
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    clientUniqueIdAtLeastOne: [id],
    fileType: [AttributeConfig.AttributeFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  const result = await queryBatch(dotYouClient, qp, ro);

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
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    tagsMatchAll: tags ?? undefined,
  };

  const result = await queryBatch(dotYouClient, qp, {
    maxRecords: pageSize,
    includeMetadataHeader: true,
  });

  let attributes: AttributeFile[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as AttributeFile[];

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
): Promise<AttributeFile | undefined> => {
  try {
    const attrPayload = await getPayload<AttributeFile>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrPayload) return undefined;
    return {
      ...attrPayload,
      fileId: attrPayload.fileId ?? dsr.fileId,
      versionTag: dsr.fileMetadata.versionTag,
      acl: dsr.serverMetadata?.accessControlList,
    };
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};

// Attribute Processors:
// Helpers:
const nameAttributeProcessing = (nameAttr: AttributeFile): AttributeFile => {
  const newData = { ...nameAttr.data };
  newData[MinimalProfileFields.DisplayName] = getDisplayNameOfNameAttribute(nameAttr);

  return { ...nameAttr, data: newData };
};

const confirmDependencyAcl = async (
  dotYouClient: DotYouClient,
  targetAcl: AccessControlList,
  targetDrive: TargetDrive,
  fileId: string
) => {
  if (fileId) {
    const imageFileMeta = await getFileHeader(dotYouClient, targetDrive, fileId);

    if (imageFileMeta && !aclEqual(targetAcl, imageFileMeta.serverMetadata.accessControlList)) {
      // Not what it should be, going to reupload it in full
      const imageData = await getDecryptedImageData(dotYouClient, targetDrive, fileId);
      if (imageData) {
        await uploadImage(
          dotYouClient,
          targetDrive,
          targetAcl,
          new Uint8Array(imageData.bytes),
          undefined,
          {
            fileId,
            versionTag: imageFileMeta.fileMetadata.versionTag,
            type: imageData.contentType,
          }
        );
      }
    }
  }
};

const photoAttributeProcessing = async (
  dotYouClient: DotYouClient,
  attr: AttributeFile
): Promise<AttributeFile> => {
  const imageFieldKey = MinimalProfileFields.ProfileImageId;
  const imageFileId = attr.data[imageFieldKey];
  const targetDrive = GetTargetDriveFromProfileId(attr.profileId);

  await confirmDependencyAcl(dotYouClient, attr.acl, targetDrive, imageFileId);

  return attr;
};

const homePageAttributeProcessing = async (
  dotYouClient: DotYouClient,
  attr: AttributeFile
): Promise<AttributeFile> => {
  const imageFieldKey = HomePageFields.HeaderImageId;
  const imageFileId = attr.data[imageFieldKey];
  const targetDrive = GetTargetDriveFromProfileId(attr.profileId);

  await confirmDependencyAcl(dotYouClient, attr.acl, targetDrive, imageFileId);

  return attr;
};

const themeAttributeProcessing = async (
  dotYouClient: DotYouClient,
  attr: AttributeFile
): Promise<AttributeFile> => {
  const imageFieldKey = HomePageThemeFields.Favicon;
  const imageFileId = attr.data[imageFieldKey].fileId;
  if (!imageFileId) return attr;

  const targetDrive = GetTargetDriveFromProfileId(attr.profileId);
  await confirmDependencyAcl(dotYouClient, attr.acl, targetDrive, imageFileId);

  return attr;
};

const processAttribute = async (dotYouClient: DotYouClient, attribute: AttributeFile) => {
  switch (attribute.type) {
    case BuiltInAttributes.Name:
      return nameAttributeProcessing(attribute);

    case BuiltInAttributes.Photo:
      return await photoAttributeProcessing(dotYouClient, attribute);

    case HomePageAttributes.HomePage:
      return await homePageAttributeProcessing(dotYouClient, attribute);

    case HomePageAttributes.Theme:
      return await themeAttributeProcessing(dotYouClient, attribute);

    default:
      return attribute;
  }
};

export const saveAttribute = async (
  dotYouClient: DotYouClient,
  toSaveAttribute: AttributeFile
): Promise<AttributeFile> => {
  // Process Attribute
  const attr = await processAttribute(dotYouClient, toSaveAttribute);

  // If a new attribute
  if (!attr.id) {
    attr.id = getNewId();
  } else if (!attr.fileId) {
    attr.fileId = (await getAttribute(dotYouClient, attr.profileId, attr.id))?.fileId ?? undefined;
  }

  const encrypt = !(
    attr.acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    attr.acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  if (!attr.id || !attr.profileId || !attr.type || !attr.sectionId) {
    throw 'Attribute is missing id, profileId, sectionId, or type';
  }

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: attr?.fileId ?? '',
      drive: GetTargetDriveFromProfileId(attr.profileId),
    },
    transitOptions: null,
  };

  const payloadJson: string = jsonStringify64({
    ...attr,
    acl: undefined,
    fileId: undefined,
  } as Attribute);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    versionTag: attr.versionTag,
    allowDistribution: false,
    contentType: 'application/json',
    appData: {
      uniqueId: attr.id,
      tags: [attr.type, attr.sectionId, attr.profileId, attr.id],
      groupId: attr.sectionId,
      fileType: AttributeConfig.AttributeFileType,
      contentIsComplete: shouldEmbedContent,
      jsonContent: shouldEmbedContent ? payloadJson : null,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: attr.acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloadBytes,
    undefined,
    encrypt
  );

  //update server-side info
  attr.fileId = result.file.fileId;
  return attr;
};

export const removeAttribute = async (
  dotYouClient: DotYouClient,
  profileId: string,
  attributeFileId: string
): Promise<void> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  deleteFile(dotYouClient, targetDrive, attributeFileId);
};
