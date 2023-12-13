import {
  UploadFileMetadata,
  UploadInstructionSet,
  DotYouClient,
  uploadFile,
  DEFAULT_PAYLOAD_KEY,
  ThumbnailFile,
  PayloadFile,
  EmbeddedThumb,
  NewDriveSearchResult,
} from '@youfoundation/js-lib/core';
import { createThumbnails } from '@youfoundation/js-lib/media';
import {
  RawContact,
  ContactFile,
  getContactByUniqueId,
  ContactConfig,
  CONTACT_PROFILE_IMAGE_KEY,
  getContactByOdinId,
} from '@youfoundation/js-lib/network';
import {
  base64ToUint8Array,
  getNewId,
  stringToUint8Array,
  toGuidId,
  jsonStringify64,
  getRandom16ByteArray,
} from '@youfoundation/js-lib/helpers';

//Handles management of Contacts
export const saveContact = async (
  dotYouClient: DotYouClient,
  contact: NewDriveSearchResult<RawContact>
): Promise<NewDriveSearchResult<ContactFile>> => {
  console.debug('Saving contact', { ...contact });

  if (contact.fileMetadata.appData.uniqueId)
    contact.fileId = (
      await getContactByUniqueId(dotYouClient, contact.fileMetadata.appData.uniqueId)
    )?.fileId;

  if (!contact.fileId && contact.fileMetadata.appData.content.odinId) {
    const existingContact = await getContactByOdinId(
      dotYouClient,
      contact.fileMetadata.appData.content.odinId
    );

    contact.fileMetadata.appData.uniqueId =
      existingContact?.fileMetadata.appData.uniqueId ?? getNewId();
    contact.fileId = existingContact?.fileId ?? undefined;
    contact.fileMetadata.versionTag =
      existingContact?.fileMetadata.versionTag || contact.fileMetadata.versionTag;
  }

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumb: EmbeddedThumb | undefined = undefined;

  // Append image:
  if (contact.fileMetadata.appData.content.image?.content) {
    const imageBlob = new Blob(
      [base64ToUint8Array(contact.fileMetadata.appData.content.image?.content)],
      {
        type: contact.fileMetadata.appData.content.image?.contentType,
      }
    );

    const { tinyThumb, additionalThumbnails } = await createThumbnails(
      imageBlob,
      CONTACT_PROFILE_IMAGE_KEY
    );
    previewThumb = tinyThumb;
    thumbnails.push(...additionalThumbnails);

    payloads.push({
      key: CONTACT_PROFILE_IMAGE_KEY,
      payload: imageBlob,
    });
  }

  const encrypt = true;

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: contact?.fileId ?? '',
      drive: ContactConfig.ContactTargetDrive,
    },
  };

  const payloadJson: string = jsonStringify64({
    ...contact.fileMetadata.appData.content,
    // image is stored in the payload, so remove it from the header content
    image: undefined,
  });
  const payloadBytes = stringToUint8Array(payloadJson);

  const tags = [];
  if (contact.fileMetadata.appData.content.odinId)
    tags.push(toGuidId(contact.fileMetadata.appData.content.odinId));

  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    appData: {
      tags: tags,
      fileType: ContactConfig.ContactFileType,
      content: shouldEmbedContent ? payloadJson : undefined,
      // Having the odinId MD5 hashed as unique id, avoids having duplicates getting created, enforced server-side;
      uniqueId: contact.fileMetadata.appData.content.odinId
        ? toGuidId(contact.fileMetadata.appData.content.odinId)
        : contact.fileMetadata.appData.uniqueId,
      previewThumbnail: previewThumb,
    },
    versionTag: contact.fileMetadata.versionTag,
    isEncrypted: encrypt,
  };

  if (!shouldEmbedContent) {
    payloads.push({
      payload: new Blob([payloadBytes], { type: 'application/json' }),
      key: DEFAULT_PAYLOAD_KEY,
    });
  }

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    encrypt
  );
  if (!result) throw new Error('Failed to upload contact');

  //update server-side info
  contact.fileId = result.file.fileId;
  return contact;
};
