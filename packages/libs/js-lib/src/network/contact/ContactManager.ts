import { OdinClient } from '../../core/OdinClient';
import { getContentFromHeaderOrPayload } from '../../core/DriveData/File/DriveFileProvider';
import { queryBatch } from '../../core/DriveData/Query/DriveQueryService';
import { CursoredResult } from '../../core/DriveData/Query/DriveQueryTypes';
import { HomebaseFile } from '../../core/DriveData/File/DriveFileTypes';
import { toGuidId } from '../../helpers/DataUtil';
import { ContactConfig, ContactFile } from './ContactTypes';
import { getFileHeaderByUniqueId } from '../../core/core';

export const CONTACT_PROFILE_IMAGE_KEY = 'prfl_pic';

export const getContactByOdinId = async (
  odinClient: OdinClient,
  odinId: string
): Promise<HomebaseFile<ContactFile> | null> =>
  getContactByUniqueId(odinClient, toGuidId(odinId));

export const getContactByUniqueId = async (
  odinClient: OdinClient,
  uniqueId: string
): Promise<HomebaseFile<ContactFile> | null> => {
  try {
    return await getFileHeaderByUniqueId<ContactFile>(
      odinClient,
      ContactConfig.ContactTargetDrive,
      uniqueId
    );
  } catch {
    return null;
  }
};

export const getContacts = async (
  odinClient: OdinClient,
  cursorState: string | undefined = undefined,
  pageSize = 10
): Promise<CursoredResult<HomebaseFile<ContactFile>[]>> => {
  const response = await queryBatch(
    odinClient,
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

          return dsrToContact(odinClient, dsr, response.includeMetadataHeader);
        })
      )
    ).filter(Boolean) as HomebaseFile<ContactFile>[],
    cursorState: response.cursorState,
  };
};

const dsrToContact = async (
  odinClient: OdinClient,
  dsr: HomebaseFile,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<ContactFile> | undefined> => {
  const contactContent: ContactFile | null = await getContentFromHeaderOrPayload<ContactFile>(
    odinClient,
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
