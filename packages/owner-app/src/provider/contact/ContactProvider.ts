import {
  UploadFileMetadata,
  UploadInstructionSet,
  DotYouClient,
  uploadFile,
  DEFAULT_PAYLOAD_KEY,
  createThumbnails,
  ThumbnailFile,
  PayloadFile,
  EmbeddedThumb,
} from '@youfoundation/js-lib/core';
import {
  RawContact,
  ContactFile,
  getContactByUniqueId,
  ContactConfig,
  CONTACT_PROFILE_IMAGE_KEY,
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
  contact: RawContact
): Promise<ContactFile> => {
  console.log('Saving contact', { ...contact });

  if (contact.id) contact.fileId = (await getContactByUniqueId(dotYouClient, contact.id))?.fileId;

  if (!contact.fileId && contact.odinId) {
    const existingContact = await getContactByUniqueId(dotYouClient, toGuidId(contact.odinId));

    contact.id = existingContact?.id ?? getNewId();
    contact.fileId = existingContact?.fileId ?? undefined;
    contact.versionTag = existingContact?.versionTag || contact.versionTag;

    // TODO multi-payload: Should we try and keep existing images
  }

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumb: EmbeddedThumb | undefined = undefined;

  // Append image:
  if (contact.image?.content) {
    const imageBlob = new Blob([base64ToUint8Array(contact.image.content)], {
      type: contact.image.contentType,
    });

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
    transitOptions: null,
  };

  const payloadJson: string = jsonStringify64({
    ...contact,
    image: undefined,
    fileId: undefined,
    versionTag: undefined,
  });
  const payloadBytes = stringToUint8Array(payloadJson);

  const tags = [];
  if (contact.id) tags.push(contact.id);

  if (contact.odinId) tags.push(toGuidId(contact.odinId));

  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    appData: {
      tags: tags,
      fileType: ContactConfig.ContactFileType,
      content: shouldEmbedContent ? payloadJson : null,
      // Having the odinId MD5 hashed as unique id, should avoid having duplicates getting created, enforced server-side;
      uniqueId: contact.odinId ? toGuidId(contact.odinId) : contact.id,
      previewThumbnail: previewThumb,
    },
    versionTag: contact.versionTag,
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
