import {
  UploadFileMetadata,
  UploadInstructionSet,
  DotYouClient,
  uploadFile,
  DEFAULT_PAYLOAD_KEY,
  ThumbnailFile,
  PayloadFile,
  EmbeddedThumb,
  NewHomebaseFile,
  UploadResult,
  getFileHeader,
  MAX_HEADER_CONTENT_BYTES,
  UpdateLocalInstructionSet,
  patchFile,
} from '@homebase-id/js-lib/core';
import { createThumbnails } from '@homebase-id/js-lib/media';
import {
  RawContact,
  getContactByUniqueId,
  ContactConfig,
  CONTACT_PROFILE_IMAGE_KEY,
  getContactByOdinId,
} from '@homebase-id/js-lib/network';
import {
  base64ToUint8Array,
  getNewId,
  stringToUint8Array,
  toGuidId,
  jsonStringify64,
  getRandom16ByteArray,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';

//Handles management of Contacts
export const saveContact = async (
  dotYouClient: DotYouClient,
  contact: NewHomebaseFile<RawContact>
): Promise<UploadResult | void> => {
  console.debug('Saving contact', { ...contact });

  if (contact.fileMetadata.appData.uniqueId) {
    const existingContact = await getContactByUniqueId(dotYouClient, contact.fileMetadata.appData.uniqueId);
    console.debug('Existing contact', { ...existingContact });
    if (existingContact) {
      contact.fileId = existingContact.fileId;
      contact.sharedSecretEncryptedKeyHeader = existingContact.sharedSecretEncryptedKeyHeader;
    }
  }

  if (!contact.fileId && contact.fileMetadata.appData.content.odinId) {
    const existingContact = await getContactByOdinId(
      dotYouClient,
      contact.fileMetadata.appData.content.odinId
    );
    console.debug('Existing contact by odinId', { ...existingContact });
    contact.fileMetadata.appData.uniqueId =
      existingContact?.fileMetadata.appData.uniqueId ?? getNewId();
    contact.fileId = existingContact?.fileId ?? undefined;
    contact.fileMetadata.versionTag =
      existingContact?.fileMetadata.versionTag || contact.fileMetadata.versionTag;
    contact.sharedSecretEncryptedKeyHeader = existingContact?.sharedSecretEncryptedKeyHeader;
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

  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;
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

  if (contact.fileId) {
    const updateInstructions: UpdateLocalInstructionSet = {
      versionTag: contact.fileMetadata.versionTag,
      file: { fileId: contact.fileId, targetDrive: ContactConfig.ContactTargetDrive },
      locale: 'local',
      transferIv: getRandom16ByteArray(),
    }
    return await patchFile(dotYouClient, contact.sharedSecretEncryptedKeyHeader, updateInstructions, metadata, payloads, thumbnails, undefined, async () => {
      if (!contact.fileId) return;
      const existingContactFile = await getFileHeader(
        dotYouClient,
        ContactConfig.ContactTargetDrive,
        contact.fileId
      );
      if (!existingContactFile) return;
      contact.fileMetadata.versionTag = existingContactFile.fileMetadata.versionTag;
      return saveContact(dotYouClient, contact);
    }).then((result) => {
      if (!result) throw new Error('Failed to upload contact');
      //todo: should we create a seperate updateContact method?
      return {
        newVersionTag: result.newVersionTag,
        recipientStatus: result.recipientStatus,
        file: {
          fileId: contact.fileId as string,
          targetDrive: ContactConfig.ContactTargetDrive,
        },
        globalTransitIdFileIdentifier: {
          globalTransitId: '',
          targetDrive: ContactConfig.ContactTargetDrive,
        },
        keyHeader: undefined,
      }
    });
  }

  return await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    encrypt,
    async () => {
      if (!contact.fileId) return;
      const existingContactFile = await getFileHeader(
        dotYouClient,
        ContactConfig.ContactTargetDrive,
        contact.fileId
      );
      if (!existingContactFile) return;
      contact.fileMetadata.versionTag = existingContactFile.fileMetadata.versionTag;
      return saveContact(dotYouClient, contact);
    }
  );
  // if (!result) throw new Error('Failed to upload contact');

  // //update server-side info
  // contact.fileId = result.file.fileId;
  // contact.fileMetadata.versionTag = result.newVersionTag;
  // return contact;
};
