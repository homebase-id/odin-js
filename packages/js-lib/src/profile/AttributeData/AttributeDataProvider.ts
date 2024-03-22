const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
import { DotYouClient } from '../../core/DotYouClient';
import { DEFAULT_PAYLOAD_KEY } from '../../core/DriveData/Upload/UploadHelpers';
import {
  FileQueryParams,
  queryBatch,
  GetBatchQueryResultOptions,
  HomebaseFile,
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
  uploadHeader,
  appendDataToFile,
  NewHomebaseFile,
  reUploadFile,
  deletePayload,
} from '../../core/core';
import {
  getDisplayNameOfNameAttribute,
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
} from '../../helpers/helpers';
import { ThumbnailInstruction } from '../../media/MediaTypes';
import { createThumbnails } from '../../media/Thumbs/ThumbnailProvider';
import { HomePageAttributes, HomePageThemeFields } from '../../public/public';
import { GetTargetDriveFromProfileId, MinimalProfileFields } from '../profile';
import { AttributeConfig, BuiltInAttributes } from './AttributeConfig';
import { Attribute } from './AttributeDataTypes';

const sortAttrs = (
  a: HomebaseFile<Attribute | undefined>,
  b: HomebaseFile<Attribute | undefined>
) =>
  (a.priority || 0) - (b.priority || 0) ||
  (a.fileMetadata.appData.content?.priority || 0) - (b.fileMetadata.appData.content?.priority || 0);

//Gets all attributes for a given profile.  if sectionId is defined, only attributes matching that section are returned.
export const getProfileAttributes = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string | undefined,
  pageSize: number
): Promise<HomebaseFile<Attribute | undefined>[]> => {
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

  let attributes: HomebaseFile<Attribute | undefined>[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as HomebaseFile<Attribute | undefined>[];

  attributes = attributes.sort(sortAttrs);
  return attributes;
};

//gets all versions of an attribute available to the caller
export const getAttributeVersions = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string | undefined,
  tags: string[]
): Promise<HomebaseFile<Attribute>[] | undefined> => {
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

  let attributes: HomebaseFile<Attribute>[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as HomebaseFile<Attribute>[];

  attributes = attributes.sort(sortAttrs);
  return attributes;
};

export const getAttributeByFileId = async (
  dotYouClient: DotYouClient,
  profileId: string,
  fileId: string
): Promise<HomebaseFile<Attribute | undefined> | null> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const header = await getFileHeader(dotYouClient, targetDrive, fileId);
  if (!header) return null;
  return dsrToAttributeFile(dotYouClient, header, targetDrive, true);
};

export const getAttribute = async (
  dotYouClient: DotYouClient,
  profileId: string,
  id: string
): Promise<HomebaseFile<Attribute | undefined> | null> => {
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

  if (result.searchResults.length == 0) return null;
  if (result.searchResults.length > 1) {
    console.warn(
      `Attribute Id [${id}] in profile [${profileId}] has more than one file. Using latest`
    );
  }

  const dsr: HomebaseFile = result.searchResults[0];
  return dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader);
};

export const getAttributes = async (
  dotYouClient: DotYouClient,
  profileId: string,
  tags: string[] | undefined,
  pageSize: number
): Promise<HomebaseFile<Attribute | undefined>[]> => {
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

  let attributes: HomebaseFile<Attribute>[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToAttributeFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as HomebaseFile<Attribute>[];

  attributes = attributes.sort(sortAttrs);
  return attributes;
};

export const dsrToAttributeFile = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<Attribute | undefined> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<Attribute>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );

    const attributeFile: HomebaseFile<Attribute | undefined> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: attrContent || undefined,
        },
      },
    };

    return attributeFile;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return null;
  }
};

// Attribute Processors:
// Helpers:
type ProcessedAttribute = {
  attr: Attribute;
  payloads: PayloadFile[];
  thumbnails?: ThumbnailFile[] | undefined;
  previewThumb?: EmbeddedThumb | undefined;
};

const nameAttributeProcessing = (nameAttr: Attribute): ProcessedAttribute => {
  const newAttr = { ...nameAttr };
  if (!nameAttr.data) nameAttr.data = {};
  nameAttr.data[MinimalProfileFields.DisplayName] = getDisplayNameOfNameAttribute(nameAttr);

  return {
    attr: newAttr,
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
const photoAttributeProcessing = async (attr: Attribute): Promise<ProcessedAttribute> => {
  const imageFieldKey = MinimalProfileFields.ProfileImageKey;
  const imageData = attr.data?.[imageFieldKey];

  const { additionalThumbnails, blob, tinyThumb } = await getNewThumbnails(
    imageData,
    PHOTO_PAYLOAD_KEY,
    profileInstructionThumbSizes
  );

  if (attr.data && imageData) attr.data[imageFieldKey] = PHOTO_PAYLOAD_KEY;

  return {
    attr,
    thumbnails: additionalThumbnails,
    previewThumb: tinyThumb,
    payloads: blob ? [{ payload: blob, key: PHOTO_PAYLOAD_KEY }] : [],
  };
};

const EXPERIENCE_PAYLOAD_KEY = 'xprnc_key';
const experienceAttributeProcessing = async (attr: Attribute): Promise<ProcessedAttribute> => {
  const imageFieldKey = MinimalProfileFields.ExperienceImageFileKey;
  const imageData = attr.data?.[imageFieldKey];

  const { additionalThumbnails, blob, tinyThumb } = await getNewThumbnails(
    imageData,
    EXPERIENCE_PAYLOAD_KEY
  );

  if (attr.data && imageData) attr.data[imageFieldKey] = EXPERIENCE_PAYLOAD_KEY;

  return {
    attr: attr,
    thumbnails: additionalThumbnails,
    previewThumb: tinyThumb,
    payloads: blob ? [{ payload: blob, key: EXPERIENCE_PAYLOAD_KEY }] : [],
  };
};

const FAVICON_PAYLOAD_KEY = 'fvcn_key';
const HEADER_PAYLOAD_KEY = 'headr_key';
const themeAttributeProcessing = async (attr: Attribute): Promise<ProcessedAttribute> => {
  const faviconFieldKey = HomePageThemeFields.Favicon;
  const faviconImageData = attr.data?.[faviconFieldKey]?.fileKey;

  const { additionalThumbnails: faviconThumbnails, blob: faviconBlob } = await getNewThumbnails(
    faviconImageData,
    FAVICON_PAYLOAD_KEY,
    []
  );

  if (attr.data && faviconImageData) attr.data[faviconFieldKey] = { fileKey: FAVICON_PAYLOAD_KEY };

  const imageFieldKey = HomePageThemeFields.HeaderImageKey;
  const headerImageData = attr.data?.[imageFieldKey];

  const {
    additionalThumbnails: headerThumbnails,
    blob: headerBlob,
    tinyThumb: headerTiny,
  } = await getNewThumbnails(headerImageData, HEADER_PAYLOAD_KEY, headerInstructionThumbSizes);

  if (attr.data && headerImageData) attr.data[imageFieldKey] = HEADER_PAYLOAD_KEY;

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

const processAttribute = async (attribute: Attribute) => {
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
  toSaveAttribute: HomebaseFile<Attribute> | NewHomebaseFile<Attribute>,
  onVersionConflict?: () => void
): Promise<HomebaseFile<Attribute> | NewHomebaseFile<Attribute> | undefined> => {
  let runningVersionTag = toSaveAttribute.fileMetadata.versionTag as string;
  const targetDrive = GetTargetDriveFromProfileId(
    toSaveAttribute.fileMetadata.appData.content.profileId
  );
  // Process Attribute
  const {
    attr: attrContent,
    payloads,
    thumbnails,
    previewThumb,
  } = await processAttribute(toSaveAttribute.fileMetadata.appData.content);
  toSaveAttribute.fileMetadata.appData.content = attrContent;

  // If a new attribute
  if (!attrContent.id) attrContent.id = getNewId();
  else if (!toSaveAttribute.fileId)
    toSaveAttribute.fileId =
      (await getAttribute(dotYouClient, attrContent.profileId, attrContent.id))?.fileId ??
      undefined;

  const encrypt = !(
    toSaveAttribute.serverMetadata?.accessControlList.requiredSecurityGroup ===
      SecurityGroupType.Anonymous ||
    toSaveAttribute.serverMetadata?.accessControlList.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

  if (!attrContent.id || !attrContent.profileId || !attrContent.type || !attrContent.sectionId)
    throw 'Attribute is missing id, profileId, sectionId, or type';

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: toSaveAttribute?.fileId ?? '',
      drive: targetDrive,
    },
  };

  const payloadJson: string = jsonStringify64(attrContent);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  if (!shouldEmbedContent)
    payloads.push({
      payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
      key: DEFAULT_PAYLOAD_KEY,
    });

  const metadata: UploadFileMetadata = {
    versionTag: toSaveAttribute.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: attrContent.id,
      tags: [attrContent.type, attrContent.sectionId, attrContent.profileId, attrContent.id],
      groupId: attrContent.sectionId,
      fileType: AttributeConfig.AttributeFileType,
      content: shouldEmbedContent ? payloadJson : undefined,
      previewThumbnail: previewThumb || toSaveAttribute.fileMetadata.appData.previewThumbnail,
    },
    isEncrypted: encrypt,
    accessControlList: toSaveAttribute.serverMetadata?.accessControlList,
  };

  if (toSaveAttribute.fileId) {
    const wasEncrypted =
      'isEncrypted' in toSaveAttribute.fileMetadata && toSaveAttribute.fileMetadata.isEncrypted;

    // When switching between encrypted and unencrypted, we need to re-upload the full file
    if (wasEncrypted !== encrypt) {
      const result = await reUploadFile(dotYouClient, instructionSet, metadata, encrypt);
      if (result)
        return {
          ...toSaveAttribute,
          fileId: result.file.fileId,
          fileMetadata: {
            ...toSaveAttribute.fileMetadata,
            versionTag: result.newVersionTag,
            isEncrypted: encrypt,
          },
        } as HomebaseFile<Attribute>;

      throw new Error('We failed to change encryption status of an attribute');
    }

    const existingAttribute = await getAttributeByFileId(
      dotYouClient,
      attrContent.profileId,
      toSaveAttribute.fileId
    );
    const existingPayloads = existingAttribute?.fileMetadata?.payloads || [];

    const keyHeader =
      wasEncrypted && encrypt && 'sharedSecretEncryptedKeyHeader' in toSaveAttribute
        ? toSaveAttribute.sharedSecretEncryptedKeyHeader
        : undefined;

    const existingDefaultPayload = existingPayloads.find(
      (payload) => payload.key === DEFAULT_PAYLOAD_KEY
    );

    if (keyHeader && existingDefaultPayload?.iv) {
      keyHeader.iv = existingDefaultPayload.iv;
    } else if (keyHeader && !shouldEmbedContent) {
      // Fail if we can't find the IV for the existing default payload (and we need it)
      throw new Error('We failed to find the IV of an attribute to upload with');
    }

    if (payloads.length) {
      runningVersionTag = (
        await appendDataToFile(
          dotYouClient,
          keyHeader,
          {
            targetFile: {
              fileId: toSaveAttribute.fileId,
              targetDrive: targetDrive,
            },
            versionTag: runningVersionTag,
          },
          payloads,
          thumbnails
        )
      ).newVersionTag;
    }

    // Cleanup the default payload if it existed, and we don't need it anymore
    if (shouldEmbedContent && existingDefaultPayload) {
      runningVersionTag = (
        await deletePayload(
          dotYouClient,
          targetDrive,
          toSaveAttribute.fileId,
          DEFAULT_PAYLOAD_KEY,
          runningVersionTag
        )
      ).newVersionTag;
    }

    // Only save update header
    const appendInstructions: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: toSaveAttribute.fileId,
        drive: targetDrive,
      },
    };

    metadata.versionTag = runningVersionTag || metadata.versionTag;
    const result = await uploadHeader(
      dotYouClient,
      keyHeader,
      appendInstructions,
      metadata,
      onVersionConflict
    );
    if (result) {
      return {
        ...toSaveAttribute,
        fileId: result.file.fileId,
        fileMetadata: {
          ...toSaveAttribute.fileMetadata,
          versionTag: result.newVersionTag,
        },
      } as NewHomebaseFile<Attribute>;
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
  return {
    ...toSaveAttribute,
    fileId: result.file.fileId,
    fileMetadata: {
      ...toSaveAttribute.fileMetadata,
      versionTag: result.newVersionTag,
    },
  } as NewHomebaseFile<Attribute>;
};

export const removeAttribute = async (
  dotYouClient: DotYouClient,
  profileId: string,
  attributeFileId: string
): Promise<void> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  deleteFile(dotYouClient, targetDrive, attributeFileId);
};
