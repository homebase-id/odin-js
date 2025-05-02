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
  HomebaseFile,
  DEFAULT_PAYLOAD_KEY,
} from '@homebase-id/js-lib/core';
import { jsonStringify64 } from '@homebase-id/js-lib/helpers';
import { useOdinClientContext } from '@homebase-id/common-app';

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
    isEncrypted: boolean;
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

export const useExport = () => {
  const odinClient = useOdinClientContext();

  const getAllFilesOnDrive = async (drive: TargetDrive) => {
    const queryBatchPart = async (cursorState: string | undefined) => {
      return await queryBatch(
        odinClient,
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

    const getPayloadForDsr = async (dsr: HomebaseFile) => {
      if (dsr.fileMetadata.appData.content) {
        return await getContentFromHeaderOrPayload(
          odinClient,
          targetDrive,
          dsr,
          includeMetadataHeader
        );
      } else {
        return (
          (await getPayloadBytes(odinClient, targetDrive, dsr.fileId, DEFAULT_PAYLOAD_KEY))
            ?.bytes || null
        );
      }
    };

    const getFile = async (dsr: HomebaseFile) => {
      return {
        fileId: dsr.fileId,
        fileMetadata: {
          senderOdinId: dsr.fileMetadata.senderOdinId,
          isEncrypted: dsr.fileMetadata.isEncrypted,
          allowDistribution: dsr.serverMetadata?.allowDistribution,
          accessControlList: dsr.serverMetadata?.accessControlList,
          appData: {
            ...dsr.fileMetadata.appData,
            content: undefined,
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
    exportUnencrypted: useMutation({ mutationFn: exportUnencrypted }),
  };
};
