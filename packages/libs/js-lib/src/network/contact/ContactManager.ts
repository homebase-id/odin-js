import { DotYouClient } from '../../core/DotYouClient';
import { getContentFromHeaderOrPayload } from '../../core/DriveData/File/DriveFileProvider';
import { queryBatch } from '../../core/DriveData/Query/DriveQueryService';
import { CursoredResult } from '../../core/DriveData/Query/DriveQueryTypes';
import { HomebaseFile } from '../../core/DriveData/File/DriveFileTypes';
import { toGuidId } from '../../helpers/DataUtil';
import { ContactConfig, ContactFile } from './ContactTypes';
import { getFileHeaderByUniqueId } from '../../core/core';

export const CONTACT_PROFILE_IMAGE_KEY = 'prfl_pic';

export const getContactByOdinId = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<HomebaseFile<ContactFile> | null> =>
  getContactByUniqueId(dotYouClient, toGuidId(odinId));

export const getContactByUniqueId = async (
  dotYouClient: DotYouClient,
  uniqueId: string
): Promise<HomebaseFile<ContactFile> | null> => {
  try {
    return await getFileHeaderByUniqueId<ContactFile>(
      dotYouClient,
      ContactConfig.ContactTargetDrive,
      uniqueId
    );
  } catch {
    return null;
  }
};

export const getContacts = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined = undefined,
  pageSize = 10
): Promise<CursoredResult<HomebaseFile<ContactFile>[]>> => {
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
          const dsr: HomebaseFile = result;
          if (!dsr) return;

          return dsrToContact(dotYouClient, dsr, response.includeMetadataHeader);
        })
      )
    ).filter(Boolean) as HomebaseFile<ContactFile>[],
    cursorState: response.cursorState,
  };
};

const dsrToContact = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<ContactFile> | undefined> => {
  const contactContent: ContactFile | null = await getContentFromHeaderOrPayload<ContactFile>(
    dotYouClient,
    ContactConfig.ContactTargetDrive,
    dsr,
    includeMetadataHeader
  );
  if (!contactContent) return;

  return {
    ...dsr,
    fileMetadata: {
      ...dsr.fileMetadata,
      appData: {
        ...dsr.fileMetadata.appData,
        content: contactContent,
      },
    },
  };
};
