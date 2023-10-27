import { useMutation } from '@tanstack/react-query';
import {
  AccessControlList,
  DriveDefinition,
  getContentFromHeaderOrPayload,
  getPayloadBytes,
  queryBatch,
  QueryBatchResponse,
  AppFileMetaData,
  TargetDrive,
  DriveSearchResult,
} from '@youfoundation/js-lib/core';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';
import useAuth from '../auth/useAuth';

const includeMetadataHeader = true;
const pageSize = 10;
const maxPages = 10;

export interface importable {
  metadata: {
    drive: DriveDefinition;
    date: string;
  };
  files: importableFile[];
}

export interface importableFile {
  fileId: string;
  fileMetadata: {
    contentType: string;
    senderOdinId: string;
    payloadIsEncrypted: boolean;
    accessControlList: AccessControlList;
    allowDistribution: boolean;
    appData: AppFileMetaData;
  };
  payload: string | Record<string, unknown>;
}

export const isImportable = (obj: unknown): obj is importable => {
  if (!obj || typeof obj !== 'object' || !('metadata' in obj) || !('files' in obj)) {
    return false;
  }

  const validatedObj = obj as Record<string, unknown>;

  if (
    !('files' in validatedObj) ||
    !Array.isArray(validatedObj['files']) ||
    validatedObj['files'] === null ||
    validatedObj['files'].length === 0
  ) {
    return false;
  }

  if (
    validatedObj['files'].some((entry) => {
      return (
        !('payload' in entry) ||
        !('fileId' in entry) ||
        !('fileMetadata' in entry) ||
        !('contentType' in entry.fileMetadata) ||
        !(typeof entry.payload === 'string' || typeof entry.payload === 'object')
      );
    })
  ) {
    return false;
  }

  return true;
};

const useExport = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const getAllFilesOnDrive = async (drive: TargetDrive) => {
    const queryBatchPart = async (cursorState: string | undefined) => {
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

    const searchResults: DriveSearchResult[] = [];
    let cursorState: string | undefined = undefined;

    for (let i = 0; i < maxPages; i++) {
      const response: QueryBatchResponse = await queryBatchPart(cursorState);
      searchResults.push(...response.searchResults);
      cursorState = response.cursorState;

      if (response.searchResults.length < pageSize) {
        break;
      }
    }

    return searchResults;
  };

  const exportUnencrypted = async (drive: DriveDefinition) => {
    const targetDrive = drive.targetDriveInfo;
    const searchResults = await getAllFilesOnDrive(targetDrive);

    const getPayloadForDsr = async (dsr: DriveSearchResult) => {
      if (dsr.fileMetadata.contentType === 'application/json') {
        return await getContentFromHeaderOrPayload(
          dotYouClient,
          targetDrive,
          dsr,
          includeMetadataHeader
        );
      } else {
        return (
          (
            await getPayloadBytes(dotYouClient, targetDrive, dsr.fileId, {
              keyHeader: dsr.sharedSecretEncryptedKeyHeader,
            })
          )?.bytes || null
        );
      }
    };

    const getFile = async (dsr: DriveSearchResult) => {
      return {
        fileId: dsr.fileId,
        fileMetadata: {
          contentType: dsr.fileMetadata.contentType,
          senderOdinId: dsr.fileMetadata.senderOdinId,
          payloadIsEncrypted: dsr.fileMetadata.payloadIsEncrypted,
          allowDistribution: dsr.serverMetadata.allowDistribution,
          accessControlList: dsr.serverMetadata.accessControlList,
          appData: {
            ...dsr.fileMetadata.appData,
            jsonContent: undefined,
            previewThumbnail: undefined,
            additionalThumbnails: undefined,
            contentIsComplete: undefined,
          },
        },
        payload: await getPayloadForDsr(dsr),
      };
    };

    const resultsWithPayload: unknown[] = await Promise.all(
      searchResults.map(async (result) => await getFile(result))
    );

    const exportable = {
      metadata: { drive: { ...drive }, date: new Date().toString() },
      files: resultsWithPayload,
    };

    const stringified = jsonStringify64(exportable);
    const url = window.URL.createObjectURL(
      new Blob([stringified], { type: 'application/json;charset=utf-8' })
    );

    return url;
  };

  return {
    exportUnencrypted: useMutation(exportUnencrypted),
  };
};

export default useExport;
