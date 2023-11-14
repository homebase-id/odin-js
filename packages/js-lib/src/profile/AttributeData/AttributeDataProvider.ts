import { DotYouClient } from '../../core/DotYouClient';
import { DEFAULT_PAYLOAD_KEY } from '../../core/DriveData/Upload/UploadHelpers';
import {
  FileQueryParams,
  queryBatch,
  GetBatchQueryResultOptions,
  DriveSearchResult,
  TargetDrive,
  getContentFromHeaderOrPayload,
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  uploadFile,
  deleteFile,
  getFileHeader,
  EmbeddedThumb,
  PayloadFile,
  ThumbnailFile,
  createThumbnails,
  ThumbnailInstruction,
  uploadHeader,
  appendDataToFile,
} from '../../core/core';
import {
  getDisplayNameOfNameAttribute,
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
} from '../../helpers/helpers';
import { HomePageAttributes, HomePageThemeFields } from '../../public/public';
import { GetTargetDriveFromProfileId, MinimalProfileFields } from '../profile';
import { AttributeConfig, BuiltInAttributes } from './AttributeConfig';
import { AttributeFile, Attribute } from './AttributeDataTypes';

const sortAttrs = (a: AttributeFile, b: AttributeFile) =>
  (a.aclPriority || 0) - (b.aclPriority || 0) || a.priority - b.priority;

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
    includeMetadataHeader: true, // Set to true to allow content to be there, and we don't need extra calls to get the header with content
  });

  let attributes: AttributeFile[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as AttributeFile[];

  attributes = attributes.sort(sortAttrs);
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

  attributes = attributes.sort(sortAttrs);
  return attributes;
};

export const getAttributeByFileId = async (
  dotYouClient: DotYouClient,
  profileId: string,
  fileId: string
): Promise<AttributeFile | undefined> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const header = await getFileHeader(dotYouClient, targetDrive, fileId);
  if (!header) return;
  return dsrToAttributeFile(dotYouClient, header, targetDrive, true);
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

  attributes = attributes.sort(sortAttrs);
  return attributes;
};

export const dsrToAttributeFile = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<AttributeFile | undefined> => {
  try {
    const attrPayload = await getContentFromHeaderOrPayload<Attribute>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrPayload) return undefined;

    const mediaPayloads = dsr.fileMetadata.payloads.filter(
      (payload) => payload.contentType !== 'application/json'
    );

    return {
      ...attrPayload,
      fileId: dsr.fileId,
      lastModified: dsr.fileMetadata.updated,
      versionTag: dsr.fileMetadata.versionTag,
      acl: dsr.serverMetadata?.accessControlList || {
        requiredSecurityGroup: SecurityGroupType.Owner,
      },
      aclPriority: dsr.priority,
      previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
      mediaPayloads: mediaPayloads,
    };
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};

// Attribute Processors:
// Helpers:
type ProcessedAttribute = {
  attr: AttributeFile;
  payloads: PayloadFile[];
  thumbnails?: ThumbnailFile[] | undefined;
  previewThumb?: EmbeddedThumb | undefined;
};

const nameAttributeProcessing = (nameAttr: AttributeFile): ProcessedAttribute => {
  const newData = { ...nameAttr.data };
  newData[MinimalProfileFields.DisplayName] = getDisplayNameOfNameAttribute(nameAttr);

  return {
    attr: { ...nameAttr, data: newData },
    payloads: [],
    thumbnails: [],
    previewThumb: undefined,
  };
};

const profileInstructionThumbSizes: ThumbnailInstruction[] = [
  { quality: 85, width: 250, height: 250 },
  { quality: 75, width: 600, height: 600 },
];

const headerInstructionThumbSizes: ThumbnailInstruction[] = [
  { quality: 85, width: 600, height: 600 },
  { quality: 75, width: 1600, height: 1600 },
  { quality: 75, width: 2600, height: 2600 },
];

const getNewThumbnails = async (
  dataKey: Blob | string | undefined,
  payloadKey: string,
  thumbnailInstructions: ThumbnailInstruction[] = []
) => {
  if (dataKey && dataKey instanceof Blob) {
    const { additionalThumbnails, tinyThumb } = await createThumbnails(
      dataKey,
      payloadKey,
      thumbnailInstructions
    );
    return { additionalThumbnails, tinyThumb, blob: dataKey };
  }
  return { additionalThumbnails: [], tinyThumb: undefined, blob: undefined };
};

const PHOTO_PAYLOAD_KEY = 'prfl_key';
const photoAttributeProcessing = async (attr: AttributeFile): Promise<ProcessedAttribute> => {
  const imageFieldKey = MinimalProfileFields.ProfileImageKey;
  const imageData = attr.data[imageFieldKey];

  const { additionalThumbnails, blob, tinyThumb } = await getNewThumbnails(
    imageData,
    PHOTO_PAYLOAD_KEY,
    profileInstructionThumbSizes
  );

  attr.data[imageFieldKey] = imageData ? PHOTO_PAYLOAD_KEY : undefined;

  return {
    attr,
    thumbnails: additionalThumbnails,
    previewThumb: tinyThumb,
    payloads: blob ? [{ payload: blob, key: PHOTO_PAYLOAD_KEY }] : [],
  };
};

const EXPERIENCE_PAYLOAD_KEY = 'xprnc_key';
const experienceAttributeProcessing = async (attr: AttributeFile): Promise<ProcessedAttribute> => {
  const imageFieldKey = MinimalProfileFields.ExperienceImageFileKey;
  const imageData = attr.data[imageFieldKey];

  const { additionalThumbnails, blob, tinyThumb } = await getNewThumbnails(
    imageData,
    EXPERIENCE_PAYLOAD_KEY
  );

  attr.data[imageFieldKey] = imageData ? EXPERIENCE_PAYLOAD_KEY : undefined;

  return {
    attr,
    thumbnails: additionalThumbnails,
    previewThumb: tinyThumb,
    payloads: blob ? [{ payload: blob, key: EXPERIENCE_PAYLOAD_KEY }] : [],
  };
};

const FAVICON_PAYLOAD_KEY = 'fvcn_key';
const HEADER_PAYLOAD_KEY = 'headr_key';
const themeAttributeProcessing = async (attr: AttributeFile): Promise<ProcessedAttribute> => {
  const faviconFieldKey = HomePageThemeFields.Favicon;
  const faviconImageData = attr?.data[faviconFieldKey]?.fileId;

  const { additionalThumbnails: faviconThumbnails, blob: faviconBlob } = await getNewThumbnails(
    faviconImageData,
    FAVICON_PAYLOAD_KEY,
    []
  );

  if (faviconImageData) attr.data[faviconFieldKey] = { fileId: FAVICON_PAYLOAD_KEY };

  const imageFieldKey = HomePageThemeFields.HeaderImageKey;
  const headerImageData = attr.data[imageFieldKey];

  const {
    additionalThumbnails: headerThumbnails,
    blob: headerBlob,
    tinyThumb: headerTiny,
  } = await getNewThumbnails(headerImageData, HEADER_PAYLOAD_KEY, headerInstructionThumbSizes);

  attr.data[imageFieldKey] = headerImageData ? HEADER_PAYLOAD_KEY : undefined;

  return {
    attr,
    thumbnails: [...faviconThumbnails, ...headerThumbnails],
    previewThumb: headerTiny,
    payloads: [
      ...(faviconBlob ? [{ payload: faviconBlob, key: FAVICON_PAYLOAD_KEY }] : []),
      ...(headerBlob ? [{ payload: headerBlob, key: HEADER_PAYLOAD_KEY }] : []),
    ],
  };
};

const processAttribute = async (attribute: AttributeFile) => {
  switch (attribute.type) {
    case BuiltInAttributes.Name:
      return nameAttributeProcessing(attribute);

    case BuiltInAttributes.Photo:
      return await photoAttributeProcessing(attribute);

    case HomePageAttributes.Theme:
      return await themeAttributeProcessing(attribute);

    case BuiltInAttributes.Experience:
      return await experienceAttributeProcessing(attribute);

    default:
      return {
        attr: attribute,
        payloads: [],
        thumbnails: [],
        previewThumb: undefined,
      } as ProcessedAttribute;
  }
};

export const saveAttribute = async (
  dotYouClient: DotYouClient,
  toSaveAttribute: AttributeFile,
  onVersionConflict?: () => void
): Promise<AttributeFile | undefined> => {
  let runningVersionTag = toSaveAttribute.versionTag;
  const targetDrive = GetTargetDriveFromProfileId(toSaveAttribute.profileId);
  // Process Attribute
  const { attr, payloads, thumbnails, previewThumb } = await processAttribute(toSaveAttribute);

  // If a new attribute
  if (!attr.id) attr.id = getNewId();
  else if (!attr.fileId)
    attr.fileId = (await getAttribute(dotYouClient, attr.profileId, attr.id))?.fileId ?? undefined;

  const encrypt = !(
    attr.acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    attr.acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  if (!attr.id || !attr.profileId || !attr.type || !attr.sectionId)
    throw 'Attribute is missing id, profileId, sectionId, or type';

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: attr?.fileId ?? '',
      drive: targetDrive,
    },
    transitOptions: null,
  };

  const payloadJson: string = jsonStringify64({
    ...attr,
    acl: undefined,
    fileId: undefined,
    previewThumbnail: undefined,
    typeDefinition: undefined,
    aclPriority: undefined,
    mediaPayloads: undefined,
  } as Attribute);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  if (!shouldEmbedContent)
    payloads.push({
      payload: new Blob([payloadBytes], { type: 'application/json' }),
      key: DEFAULT_PAYLOAD_KEY,
    });

  const metadata: UploadFileMetadata = {
    versionTag: attr.versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: attr.id,
      tags: [attr.type, attr.sectionId, attr.profileId, attr.id],
      groupId: attr.sectionId,
      fileType: AttributeConfig.AttributeFileType,
      content: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: previewThumb || attr.previewThumbnail,
    },
    isEncrypted: encrypt,
    accessControlList: attr.acl,
  };

  if (attr.fileId) {
    const pureHeader = await getFileHeader(dotYouClient, targetDrive, attr.fileId);
    const keyHeader = pureHeader?.fileMetadata.isEncrypted
      ? pureHeader.sharedSecretEncryptedKeyHeader
      : undefined;

    if (pureHeader) {
      if (payloads.length)
        runningVersionTag = (
          await appendDataToFile(
            dotYouClient,
            keyHeader,
            {
              targetFile: {
                fileId: attr.fileId,
                targetDrive: targetDrive,
              },
            },
            payloads,
            thumbnails
          )
        ).newVersionTag;

      // Only save update header
      const appendInstructions: UploadInstructionSet = {
        transferIv: getRandom16ByteArray(),
        storageOptions: {
          overwriteFileId: pureHeader.fileId,
          drive: targetDrive,
        },
        transitOptions: null,
      };

      metadata.versionTag = runningVersionTag || metadata.versionTag;
      const result = await uploadHeader(dotYouClient, keyHeader, appendInstructions, metadata);
      if (result) {
        attr.versionTag = result.newVersionTag;
        attr.fileId = result.file.fileId;
        return attr;
      }
    }
  }

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    encrypt,
    onVersionConflict
  );
  if (!result) return;

  //update server-side info
  attr.fileId = result.file.fileId;
  attr.versionTag = result.newVersionTag;
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
