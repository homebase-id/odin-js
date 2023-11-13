import { DotYouClient } from '../../core/DotYouClient';
import { getContentFromHeaderOrPayload } from '../../core/DriveData/File/DriveFileProvider';
import { queryBatch } from '../../core/DriveData/Query/DriveQueryProvider';
import { CursoredResult } from '../../core/DriveData/Query/DriveQueryTypes';
import { DriveSearchResult } from '../../core/DriveData/Drive/DriveTypes';
import { toGuidId } from '../../helpers/DataUtil';
import { ContactConfig, ContactFile } from './ContactTypes';

export const CONTACT_PROFILE_IMAGE_KEY = 'prfl_pic';

export const getContactByOdinId = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ContactFile | undefined> => getContactByUniqueId(dotYouClient, toGuidId(odinId));

export const getContactByUniqueId = async (
  dotYouClient: DotYouClient,
  uniqueId: string
): Promise<ContactFile | undefined> => {
  try {
    const response = await queryBatch(dotYouClient, {
      targetDrive: ContactConfig.ContactTargetDrive,
      clientUniqueIdAtLeastOne: [uniqueId],
    });

    if (response.searchResults.length == 0) return;
    if (response.searchResults.length > 1)
      console.warn('UniqueId [' + uniqueId + '] in contacts has more than one file. Using latest');

    const dsr: DriveSearchResult = response.searchResults[0];
    const contact: ContactFile | null = await getContentFromHeaderOrPayload<ContactFile>(
      dotYouClient,
      ContactConfig.ContactTargetDrive,
      dsr,
      response.includeMetadataHeader
    );
    if (!contact) return;

    // Set fileId for future replace
    contact.fileId = dsr.fileId;
    contact.versionTag = dsr.fileMetadata.versionTag;
    contact.lastModified = dsr.fileMetadata.updated;
    contact.hasImage =
      dsr.fileMetadata.payloads.filter((payload) => payload.contentType !== 'application/json')
        .length >= 1;

    return contact;
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
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
          const contact: ContactFile | null = await getContentFromHeaderOrPayload<ContactFile>(
            dotYouClient,
            ContactConfig.ContactTargetDrive,
            dsr,
            response.includeMetadataHeader
          );

          if (!contact) return;

          // Set fileId for future replace
          contact.fileId = dsr.fileId;
          contact.versionTag = dsr.fileMetadata.versionTag;
          contact.lastModified = dsr.fileMetadata.updated;
          contact.hasImage = dsr.fileMetadata.payloads.length === 2;

          return contact;
        })
      )
    ).filter(Boolean) as ContactFile[],
    cursorState: response.cursorState,
  };
};
