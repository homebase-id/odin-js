import { DotYouClient } from '../../core/DotYouClient';
import { getFileHeader, queryBatch } from '../../core/DriveData/DriveProvider';
import { DriveSearchResult, TargetDrive, ThumbSize } from '../../core/DriveData/DriveTypes';
import { getDecryptedImageUrl } from '../../core/MediaData/MediaProvider';
import { PhotoFile } from './PhotoTypes';

export const getPhotoLibrary = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  pageSize: number,
  cursorState?: string,
  size?: ThumbSize
) => {
  const reponse = await queryBatch(
    dotYouClient,
    { targetDrive: targetDrive },
    { cursorState: cursorState, maxRecords: pageSize, includeMetadataHeader: true }
  );

  return {
    results: await Promise.all(
      reponse.searchResults.map(
        async (dsr) => await dsrToPhoto(dotYouClient, targetDrive, dsr, size)
      )
    ),
    cursorState,
  };
};

export const getPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ThumbSize
) => {
  const searchResult = await getFileHeader(dotYouClient, targetDrive, fileId);
  return dsrToPhoto(dotYouClient, targetDrive, searchResult, size);
};

const dsrToPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: DriveSearchResult,
  size?: ThumbSize
): Promise<PhotoFile> => {
  return {
    fileId: dsr.fileId,
    url: await getDecryptedImageUrl(dotYouClient, targetDrive, dsr.fileId, size),
    date: dsr.fileMetadata.appData.userDate || dsr.fileMetadata.created,
  };
};
