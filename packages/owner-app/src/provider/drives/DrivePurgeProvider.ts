import {
  DotYouClient,
  TargetDrive,
  QueryBatchResponse,
  queryBatch,
  HomebaseFile,
} from '@youfoundation/js-lib/core';
import { assertIfDefined } from '@youfoundation/js-lib/helpers';

// This is a temporary method, and should only be used as long as there is no way to fully remove all files on a drive in one go
export const purgeAllFiles = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive
): Promise<boolean> => {
  assertIfDefined('TargetDrive', targetDrive);

  const includeMetadataHeader = true;
  const pageSize = 10;
  const maxPages = 10;

  const getAllFilesOnDrive = async (drive: TargetDrive) => {
    const querySet = async (cursorState: string | undefined): Promise<QueryBatchResponse> => {
      return await queryBatch(
        dotYouClient,
        { targetDrive: drive },
        {
          maxRecords: pageSize,
          includeMetadataHeader: includeMetadataHeader,
          cursorState: cursorState,
        }
      );
    };

    const searchResults: HomebaseFile[] = [];
    let cursorState: string | undefined = undefined;

    for (let i = 0; i < maxPages; i++) {
      const response: QueryBatchResponse = await querySet(cursorState);
      searchResults.push(...response.searchResults);
      cursorState = response.cursorState;

      if (response.searchResults.length < pageSize) break;
    }

    return searchResults;
  };

  const searchResults = await getAllFilesOnDrive(targetDrive);

  const purgeFile = (targetDrive: TargetDrive, fileId: string): Promise<boolean | void> => {
    assertIfDefined('TargetDrive', targetDrive);
    assertIfDefined('FileId', fileId);

    const client = dotYouClient.createAxiosClient();

    const request = {
      file: {
        targetDrive: targetDrive,
        fileId: fileId,
      },
      deleteLinkedFiles: true,
    };

    const config = {
      headers: {
        'X-ODIN-FILE-SYSTEM-TYPE': 'Standard',
      },
    };

    return client
      .post('/drive/files/harddelete', request, config)
      .then((response) => {
        if (response.status === 200) {
          return true;
        }

        return false;
      })
      .catch((error) => {
        console.error('[DotYouCore-js:purgeFile]', error);
        throw error;
      });
  };

  await Promise.all(
    searchResults.map(async (result) => await purgeFile(targetDrive, result.fileId))
  );

  return true;
};
