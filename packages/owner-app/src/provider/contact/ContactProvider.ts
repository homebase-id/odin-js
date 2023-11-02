import {
  UploadFileMetadata,
  UploadInstructionSet,
  SecurityGroupType,
  DotYouClient,
  uploadImage,
  uploadFile,
} from '@youfoundation/js-lib/core';
import {
  RawContact,
  ContactFile,
  getContactByUniqueId,
  ContactConfig,
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
  if (contact.id) contact.fileId = (await getContactByUniqueId(dotYouClient, contact.id))?.fileId;

  if (!contact.fileId && contact.odinId) {
    const existingContact = await getContactByUniqueId(dotYouClient, toGuidId(contact.odinId));

    contact.id = existingContact?.id ?? getNewId();
    contact.fileId = existingContact?.fileId ?? undefined;
    contact.versionTag = existingContact?.versionTag || contact.versionTag;

    // If we have an existing image, we don't want to remove it
    if (existingContact?.imageFileId)
      contact.imageFileId = existingContact?.imageFileId ?? undefined;
  }

  // Save raw image:
  if (contact.image?.content) {
    contact.imageFileId = (
      await uploadImage(
        dotYouClient,
        ContactConfig.ContactTargetDrive,
        { requiredSecurityGroup: SecurityGroupType.Owner },
        base64ToUint8Array(contact.image.content),
        undefined,
        {
          fileId: contact.imageFileId,
          type: contact.image.contentType,
        }
      )
    )?.fileId;
    contact.image = undefined;
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
      contentIsComplete: shouldEmbedContent,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      // Having the odinId MD5 hashed as unique id, should avoid having duplicates getting created, enforced servers side;
      uniqueId: contact.odinId ? toGuidId(contact.odinId) : contact.id,
    },
    versionTag: contact.versionTag,
    payloadIsEncrypted: encrypt,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    shouldEmbedContent ? undefined : new Blob([payloadBytes], { type: 'application/json' }),
    undefined,
    encrypt
  );
  if (!result) throw new Error('Failed to upload contact');

  //update server-side info
  contact.fileId = result.file.fileId;
  return contact;
};
