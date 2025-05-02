const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

import {
  OdinClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  UploadInstructionSet,
  DEFAULT_PAYLOAD_KEY,
  UploadFileMetadata,
  reUploadFile,
  uploadFile,
  deleteFile,
  PayloadFile,
  ThumbnailFile,
  EmbeddedThumb,
  getFileHeader,
  patchFile,
  UpdateLocalInstructionSet,
  MAX_HEADER_CONTENT_BYTES,
} from '@homebase-id/js-lib/core';
import {
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
  getDisplayNameOfNameAttribute,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';

import { HomePageThemeFields, HomePageAttributes } from '@homebase-id/js-lib/public';
import { ThumbnailInstruction, createThumbnails } from '@homebase-id/js-lib/media';
import {
  Attribute,
  GetTargetDriveFromProfileId,
  AttributeConfig,
  MinimalProfileFields,
  BuiltInAttributes,
  getProfileAttribute,
  homebaseFileToProfileAttribute,
} from '@homebase-id/js-lib/profile';

export const saveProfileAttribute = async (
  odinClient: OdinClient,
  toSaveAttribute: HomebaseFile<Attribute> | NewHomebaseFile<Attribute>,
  onVersionConflict?: () => void
): Promise<HomebaseFile<Attribute> | NewHomebaseFile<Attribute> | undefined> => {
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
      (await getProfileAttribute(odinClient, attrContent.profileId, attrContent.id))?.fileId ??
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
  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;
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
      const result = await reUploadFile(odinClient, instructionSet, metadata, encrypt);
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
      odinClient,
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

    const toDeletePayloads: { key: string }[] = [];
    if (!shouldEmbedContent) {
      payloads.push({
        key: DEFAULT_PAYLOAD_KEY,
        payload: new Blob([payloadBytes], { type: 'application/json' }),
        iv: getRandom16ByteArray(),
      });
    } else {
      if (
        toSaveAttribute.fileMetadata?.payloads?.some((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)
      ) {
        toDeletePayloads.push({
          key: DEFAULT_PAYLOAD_KEY,
        });
      }
    }

    const patchInstructions: UpdateLocalInstructionSet = {
      transferIv: getRandom16ByteArray(),
      locale: 'local',
      versionTag: toSaveAttribute.fileMetadata.versionTag,
      file: {
        fileId: toSaveAttribute.fileId,
        targetDrive: targetDrive,
      },
    };

    const result = await patchFile(
      odinClient,
      keyHeader,
      patchInstructions,
      metadata,
      payloads,
      thumbnails,
      toDeletePayloads,
      onVersionConflict
    );
    if (result) {
      return {
        ...toSaveAttribute,
        fileMetadata: {
          ...toSaveAttribute.fileMetadata,
          versionTag: result.newVersionTag,
        },
      } as NewHomebaseFile<Attribute>;
    }
  }

  const result = await uploadFile(
    odinClient,
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

export const removeProfileAttribute = async (
  odinClient: OdinClient,
  profileId: string,
  attributeFileId: string
): Promise<void> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  deleteFile(odinClient, targetDrive, attributeFileId);
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

const getAttributeByFileId = async (
  odinClient: OdinClient,
  profileId: string,
  fileId: string
): Promise<HomebaseFile<Attribute | undefined> | null> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const header = await getFileHeader(odinClient, targetDrive, fileId);
  if (!header) return null;
  return homebaseFileToProfileAttribute(odinClient, header, targetDrive, true);
};
