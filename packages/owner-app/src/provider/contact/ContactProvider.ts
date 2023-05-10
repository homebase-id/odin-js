import {
  DriveSearchResult,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
  SecurityGroupType,
  CursoredResult,
  DotYouClient,
  uploadImage,
  uploadFile,
  getPayload,
  queryBatch,
  getRandom16ByteArray,
  base64ToUint8Array,
  getNewId,
  stringToUint8Array,
  toGuidId,
  jsonStringify64,
} from '@youfoundation/js-lib';

import { ContactConfig, ContactFile, RawContact } from './ContactTypes';

//Handles management of Contacts
export const saveContact = async (
  dotYouClient: DotYouClient,
  contact: RawContact
): Promise<ContactFile> => {
  if (contact.id) {
    contact.fileId = (await getContactByUniqueId(dotYouClient, contact.id))?.fileId;
  }

  if (!contact.fileId && contact.odinId) {
    const existingContact = await getContactByUniqueId(dotYouClient, toGuidId(contact.odinId));

    contact.id = existingContact?.id ?? getNewId();
    contact.fileId = existingContact?.fileId ?? undefined;
    contact.versionTag = existingContact?.versionTag || contact.versionTag;
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

  const payloadJson: string = jsonStringify64(contact as ContactFile);
  const payloadBytes = stringToUint8Array(payloadJson);

  const tags = [];
  if (contact.id) tags.push(contact.id);

  if (contact.odinId) tags.push(toGuidId(contact.odinId));

  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    contentType: 'application/json',
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

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloadBytes,
    undefined,
    encrypt
  );

  //update server-side info
  contact.fileId = result.file.fileId;
  return contact;
};

export const getContactByUniqueId = async (
  dotYouClient: DotYouClient,
  uniqueId: string
): Promise<ContactFile | undefined> => {
  try {
    const response = await queryBatch(dotYouClient, {
      targetDrive: ContactConfig.ContactTargetDrive,
      clientUniqueIdAtLeastOne: [uniqueId],
    });

    if (response.searchResults.length == 0) {
      return;
    }

    if (response.searchResults.length > 1) {
      console.warn('UniqueId [' + uniqueId + '] in contacts has more than one file. Using latest');
    }

    const dsr: DriveSearchResult = response.searchResults[0];
    const contact: ContactFile | null = await getPayload<ContactFile>(
      dotYouClient,
      ContactConfig.ContactTargetDrive,
      dsr,
      response.includeMetadataHeader
    );
    if (!contact) return;

    // Set fileId for future replace
    contact.fileId = dsr.fileId;
    contact.versionTag = dsr.fileMetadata.versionTag;

    return contact;
  } catch (ex) {
    throw new Error('Something went wrong fetching a contact');
  }
};

export const getContactByTag = async (
  dotYouClient: DotYouClient,
  tag: string
): Promise<ContactFile | undefined> => {
  const response = await queryBatch(dotYouClient, {
    targetDrive: ContactConfig.ContactTargetDrive,
    tagsMatchAtLeastOne: [tag],
  });

  if (response.searchResults.length == 0) {
    return;
  }

  if (response.searchResults.length > 1) {
    console.warn('Tag [' + tag + '] in contacts has more than one file. Using latest');
  }

  const dsr: DriveSearchResult = response.searchResults[0];
  const contact: ContactFile | null = await getPayload<ContactFile>(
    dotYouClient,
    ContactConfig.ContactTargetDrive,
    dsr,
    response.includeMetadataHeader
  );
  if (!contact) return;

  // Set fileId for future replace
  contact.fileId = dsr.fileId;
  contact.versionTag = dsr.fileMetadata.versionTag;

  return contact;
};

export const getContacts = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined = undefined,
  pageSize = 10
): Promise<CursoredResult<ContactFile[]>> => {
  const response = await queryBatch(
    dotYouClient,
    {
      targetDrive: ContactConfig.ContactTargetDrive,
      fileType: [ContactConfig.ContactFileType],
    },
    { maxRecords: pageSize, cursorState: cursorState, includeMetadataHeader: true }
  );

  if (response.searchResults.length == 0) {
    return { results: [], cursorState: '' };
  }

  return {
    results: (
      await Promise.all(
        response.searchResults.map(async (result) => {
          const dsr: DriveSearchResult = result;
          const contact: ContactFile | null = await getPayload<ContactFile>(
            dotYouClient,
            ContactConfig.ContactTargetDrive,
            dsr,
            response.includeMetadataHeader
          );

          if (!contact) return;

          // Set fileId for future replace
          contact.fileId = dsr.fileId;
          contact.versionTag = dsr.fileMetadata.versionTag;

          return contact;
        })
      )
    ).filter(Boolean) as ContactFile[],
    cursorState: response.cursorState,
  };
};
