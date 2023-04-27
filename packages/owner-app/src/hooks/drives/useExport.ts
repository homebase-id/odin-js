import { useMutation } from '@tanstack/react-query';
import {
  AccessControlList,
  DotYouClient,
  DriveDefinition,
  ensureDrive,
  getFileHeader,
  getPayload,
  getPayloadBytes,
  purgeAllFiles,
  queryBatch,
  getRandom16ByteArray,
  uploadFile,
  uploadImage,
  base64ToUint8Array,
  stringToUint8Array,
  jsonStringify64,
  ImageContentType,
  QueryBatchResponse,
} from '@youfoundation/js-lib';
import { UploadInstructionSet } from '@youfoundation/js-lib';
import { UploadFileMetadata } from '@youfoundation/js-lib';
import { AppFileMetaData } from '@youfoundation/js-lib';
import { ApiType, DriveSearchResult, TargetDrive } from '@youfoundation/js-lib';
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
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

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
        return await getPayload(dotYouClient, targetDrive, dsr, includeMetadataHeader);
      } else {
        return (
          await getPayloadBytes(
            dotYouClient,
            targetDrive,
            dsr.fileId,
            dsr.sharedSecretEncryptedKeyHeader
          )
        ).bytes;
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

  const clearAllFilesOnDrive = async (drive: TargetDrive) => {
    return await purgeAllFiles(dotYouClient, drive);
  };

  const importUnencrypted = async ({
    drive,
    formatDrive,
    data,
  }: {
    drive?: TargetDrive;
    formatDrive?: boolean;
    data: unknown;
  }) => {
    if (!isImportable(data)) {
      return [{ fileId: 'root', status: false }];
    }

    let targetDrive: TargetDrive = drive || data.metadata.drive.targetDriveInfo;
    if (!drive) {
      await ensureDrive(
        dotYouClient,
        data.metadata.drive.targetDriveInfo,
        data.metadata.drive.name,
        data.metadata.drive.metadata,
        data.metadata.drive.allowAnonymousReads
      );

      targetDrive = data.metadata.drive.targetDriveInfo;
    } else if (formatDrive) {
      await clearAllFilesOnDrive(targetDrive);
    }

    return await Promise.all(
      data.files.map(async (file) => {
        try {
          const existingFile = await getFileHeader(dotYouClient, targetDrive, file.fileId);
          const overwriteFileId = formatDrive || !existingFile ? undefined : file.fileId;
          const versionTag = formatDrive || !existingFile ? undefined : file.fileId;

          // Check if image file:
          if (
            ['image/png', 'image/jpeg', 'image/tiff', 'image/webp', 'image/svg+xml'].includes(
              file.fileMetadata.contentType
            )
          ) {
            await uploadImage(
              dotYouClient,
              targetDrive,
              file.fileMetadata.accessControlList,
              base64ToUint8Array(file.payload.toString()),
              undefined,
              {
                tag: file.fileMetadata.appData.tags || [],
                fileId: overwriteFileId,
                versionTag: versionTag,
                type: file.fileMetadata.contentType as ImageContentType,
              }
            );
          } else {
            const instructionSet: UploadInstructionSet = {
              transferIv: getRandom16ByteArray(),
              storageOptions: {
                overwriteFileId: overwriteFileId,
                drive: targetDrive,
              },
              transitOptions: null,
            };

            const payloadJson =
              file.fileMetadata.contentType === 'application/json'
                ? jsonStringify64(file.payload)
                : null;

            const payloadBytes = payloadJson
              ? stringToUint8Array(payloadJson)
              : base64ToUint8Array(file.payload.toString());

            const shouldEmbedContent = payloadBytes.length < 3000;
            const metadata: UploadFileMetadata = {
              allowDistribution: file.fileMetadata.allowDistribution,
              contentType: file.fileMetadata.contentType,
              senderOdinId: file.fileMetadata.senderOdinId,
              payloadIsEncrypted: file.fileMetadata.payloadIsEncrypted,
              accessControlList: file.fileMetadata.accessControlList,
              appData: {
                ...file.fileMetadata.appData,
                contentIsComplete: shouldEmbedContent,
                jsonContent: shouldEmbedContent ? payloadJson : null,
              },
            };

            await uploadFile(
              dotYouClient,
              instructionSet,
              metadata,
              payloadBytes,
              undefined,
              file.fileMetadata.payloadIsEncrypted
            );
          }
        } catch (ex) {
          console.error(ex);
          return { fileId: file.fileId, status: false };
        }

        return { fileId: file.fileId, status: true };
      })
    );
  };

  return {
    exportUnencrypted: useMutation(exportUnencrypted),
    importUnencrypted: useMutation(importUnencrypted),
  };
};

export default useExport;
