import { useMutation } from '@tanstack/react-query';
import {
  TargetDrive,
  ensureDrive,
  getFileHeader,
  UploadInstructionSet,
  UploadFileMetadata,
  uploadFile,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import { uploadImage } from '@youfoundation/js-lib/media';
import {
  base64ToUint8Array,
  jsonStringify64,
  stringToUint8Array,
  getRandom16ByteArray,
} from '@youfoundation/js-lib/helpers';
import { purgeAllFiles } from '../../provider/drives/DrivePurgeProvider';
import { useAuth } from '../auth/useAuth';
import { isImportable } from './useExport';

export const useImport = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const clearAllFilesOnDrive = async (drive: TargetDrive) =>
    await purgeAllFiles(dotYouClient, drive);

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
              new Blob([base64ToUint8Array(file.payload.toString())], {
                type: file.fileMetadata.contentType,
              }),
              undefined,
              {
                tag: file.fileMetadata.appData.tags || [],
                fileId: overwriteFileId,
                versionTag: versionTag,
              }
            );
          } else {
            const instructionSet: UploadInstructionSet = {
              transferIv: getRandom16ByteArray(),
              storageOptions: {
                overwriteFileId: overwriteFileId,
                drive: targetDrive,
              },
            };

            const payloadJson =
              file.fileMetadata.contentType === 'application/json'
                ? jsonStringify64(file.payload)
                : undefined;

            const payloadBytes = payloadJson
              ? stringToUint8Array(payloadJson)
              : base64ToUint8Array(file.payload.toString());

            const shouldEmbedContent = payloadBytes.length < 3000;
            const metadata: UploadFileMetadata = {
              allowDistribution: file.fileMetadata.allowDistribution,
              senderOdinId: file.fileMetadata.senderOdinId,
              isEncrypted: file.fileMetadata.isEncrypted,
              accessControlList: file.fileMetadata.accessControlList,
              appData: {
                ...file.fileMetadata.appData,
                content: shouldEmbedContent ? payloadJson : undefined,
              },
            };

            await uploadFile(
              dotYouClient,
              instructionSet,
              metadata,
              [
                {
                  payload: new Blob([payloadBytes], { type: file.fileMetadata.contentType }),
                  key: DEFAULT_PAYLOAD_KEY,
                },
              ],
              undefined,
              file.fileMetadata.isEncrypted
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
    importUnencrypted: useMutation({ mutationFn: importUnencrypted }),
  };
};
