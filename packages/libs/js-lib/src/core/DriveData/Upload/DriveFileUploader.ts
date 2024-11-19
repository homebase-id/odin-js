import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { DotYouClient } from '../../DotYouClient';
import { PayloadFile, ThumbnailFile, KeyHeader, EncryptedKeyHeader } from '../File/DriveFileTypes';
import {
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
  AppendInstructionSet,
  AppendResult,
  UpdateResult,
  UpdateInstructionSet,
  UpdateHeaderInstructionSet,
  UpdateLocalInstructionSet,
  ScheduleOptions,
  PriorityOptions,
  SendContents,
} from './DriveUploadTypes';
import { decryptKeyHeader } from '../SecurityHelpers';
import {
  GenerateKeyHeader,
  buildDescriptor,
  buildFormData,
  pureUpload,
  pureAppend,
  buildManifest,
  pureUpdate,
  buildUpdateManifest,
} from './UploadHelpers';
import { getFileHeader, getPayloadBytes, getThumbBytes } from '../File/DriveFileProvider';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
import { AxiosRequestConfig } from 'axios';
import { deletePayload } from '../File/DriveFileManager';
const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

const isDebug = hasDebugFlag();

/// Upload methods:
export const uploadFile = async (
  dotYouClient: DotYouClient,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  encrypt = true,
  onVersionConflict?: () => Promise<void | UploadResult> | void,
  options?: {
    axiosConfig?: AxiosRequestConfig;
    aesKey?: Uint8Array | undefined;
  }
): Promise<UploadResult | void> => {
  isDebug &&
    console.debug('request', new URL(`${dotYouClient.getEndpoint()}/drive/files/upload`).pathname, {
      instructions,
      metadata,
      payloads,
      thumbnails,
    });

  // Force isEncrypted on the metadata to match the encrypt flag
  metadata.isEncrypted = encrypt || !!options?.aesKey;

  const keyHeader = encrypt ? GenerateKeyHeader(options?.aesKey) : undefined;

  const { systemFileType, ...strippedInstructions } = instructions;

  const manifest = buildManifest(payloads, thumbnails, encrypt);
  const instructionsWithManifest = {
    ...strippedInstructions,
    manifest,
    transferIv: instructions.transferIv || getRandom16ByteArray(),
  };

  // Build package
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    keyHeader,
    instructionsWithManifest,
    metadata
  );

  const data = await buildFormData(
    instructionsWithManifest,
    encryptedDescriptor,
    payloads,
    thumbnails,
    keyHeader,
    manifest
  );

  // Upload
  const uploadResult = await pureUpload(
    dotYouClient,
    data,
    systemFileType,
    onVersionConflict,
    options?.axiosConfig
  );

  if (!uploadResult) return;
  uploadResult.keyHeader = keyHeader;
  return uploadResult;
};

export const patchFile = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: UpdateInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  toDeletePayloads?: { key: string }[],
  onVersionConflict?: () => Promise<void | UpdateResult> | void,
  options?: {
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<UpdateResult | UploadResult | void> => {
  if (instructions.locale === 'local') {
    return patchFileLocal(
      dotYouClient,
      keyHeader,
      instructions,
      metadata,
      payloads,
      thumbnails,
      toDeletePayloads,
      undefined,
      options
    );
  }

  isDebug &&
    console.debug('request', new URL(`${dotYouClient.getEndpoint()}/drive/files/update`).pathname, {
      instructions,
      metadata,
      payloads,
      thumbnails,
    });

  const decryptedKeyHeader =
    keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader;

  const { systemFileType, ...strippedInstructions } = instructions;

  const manifest = buildUpdateManifest(
    payloads,
    toDeletePayloads,
    thumbnails,
    !!decryptedKeyHeader
  );
  const instructionsWithManifest = {
    ...strippedInstructions,
    manifest,
    transferIv: instructions.transferIv || getRandom16ByteArray(),
  };

  // Build package
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    decryptedKeyHeader,
    instructionsWithManifest,
    metadata
  );

  const data = await buildFormData(
    instructionsWithManifest,
    encryptedDescriptor,
    payloads,
    thumbnails,
    decryptedKeyHeader,
    manifest
  );

  // Upload
  const updateResult = await pureUpdate(
    dotYouClient,
    data,
    systemFileType,
    onVersionConflict,
    options?.axiosConfig
  );

  if (!updateResult) return;
  return updateResult;
};

const patchFileLocal = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: UpdateLocalInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  toDeletePayloads?: { key: string }[],
  onVersionConflict?: () => Promise<void | UploadResult> | void,
  options?: {
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<UploadResult | void> => {
  if (!metadata.versionTag) {
    throw new Error('metadata.versionTag is required');
  }
  let runningVersionTag: string = metadata.versionTag;

  if (toDeletePayloads?.length) {
    for (let i = 0; i < toDeletePayloads.length; i++) {
      const mediaFile = toDeletePayloads[i];

      runningVersionTag = (
        await deletePayload(
          dotYouClient,
          instructions.file.targetDrive,
          instructions.file.fileId,
          mediaFile.key,
          runningVersionTag
        )
      ).newVersionTag;
    }
  }

  // Append new files:
  if (payloads?.length) {
    const appendInstructionSet: AppendInstructionSet = {
      targetFile: instructions.file,
      versionTag: runningVersionTag,
      storageIntent: 'append',
    };

    runningVersionTag =
      (
        await appendDataToFile(
          dotYouClient,
          keyHeader,
          appendInstructionSet,
          payloads,
          thumbnails,
          onVersionConflict
        )
      )?.newVersionTag || runningVersionTag;
  }

  if (runningVersionTag) metadata.versionTag = runningVersionTag;
  const instructionSet: UpdateHeaderInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: instructions.file.fileId,
      drive: instructions.file.targetDrive,
    },
    transitOptions: instructions.recipients
      ? {
          recipients: instructions.recipients,
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.Medium,
          sendContents: SendContents.All, // TODO: Should this be header only?
        }
      : undefined,
    storageIntent: 'header',
  };

  return await uploadHeader(
    dotYouClient,
    keyHeader,
    instructionSet,
    metadata,
    onVersionConflict,
    options?.axiosConfig
  );
};

export const uploadHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: UpdateHeaderInstructionSet,
  metadata: UploadFileMetadata,
  onVersionConflict?: () => Promise<void | UploadResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UploadResult | void> => {
  isDebug &&
    console.debug('request', new URL(`${dotYouClient.getEndpoint()}/drive/files/upload`).pathname, {
      instructions,
      metadata,
    });

  const decryptedKeyHeader = metadata.isEncrypted
    ? keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader
    : undefined;

  if (!decryptedKeyHeader && metadata.isEncrypted)
    throw new Error('[odin-js] Missing existing keyHeader for appending encrypted metadata.');

  if (decryptedKeyHeader) {
    // Generate a new IV for the keyHeader
    decryptedKeyHeader.iv = getRandom16ByteArray();
  }

  const { systemFileType, ...strippedInstructions } = instructions;
  if (!strippedInstructions.storageOptions) throw new Error('storageOptions is required');

  strippedInstructions.storageOptions.storageIntent = 'metadataOnly';
  strippedInstructions.transferIv = instructions.transferIv || getRandom16ByteArray();

  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    decryptedKeyHeader,
    strippedInstructions,
    metadata
  );

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    undefined,
    undefined,
    undefined,
    undefined
  );

  // Upload
  return await pureUpload(dotYouClient, data, systemFileType, onVersionConflict, axiosConfig);
};

export const appendDataToFile = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: AppendInstructionSet,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  onVersionConflict?: () => Promise<void | AppendResult> | void,
  axiosConfig?: AxiosRequestConfig
) => {
  isDebug &&
    console.debug(
      'request',
      new URL(`${dotYouClient.getEndpoint()}/drive/files/uploadpayload`).pathname,
      {
        instructions,
        payloads,
        thumbnails,
      }
    );

  const encrypt = !!keyHeader;
  const decryptedKeyHeader =
    keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader;

  const { systemFileType, ...strippedInstructions } = instructions;

  const manifest = buildManifest(payloads, thumbnails, encrypt);
  const instructionsWithManifest = {
    ...strippedInstructions,
    manifest,
  };

  const data = await buildFormData(
    instructionsWithManifest,
    undefined,
    payloads,
    thumbnails,
    decryptedKeyHeader,
    manifest
  );

  return await pureAppend(dotYouClient, data, systemFileType, onVersionConflict, axiosConfig);
};

export const reUploadFile = async (
  dotYouClient: DotYouClient,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  encrypt: boolean,
  axiosConfig?: AxiosRequestConfig
) => {
  const targetDrive = instructions.storageOptions?.drive;
  const fileId = instructions.storageOptions?.overwriteFileId;
  if (!targetDrive) throw new Error('storageOptions.drive is required');
  if (!fileId) throw new Error('storageOptions.overwriteFileId is required');

  const header = await getFileHeader(dotYouClient, targetDrive, fileId);

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

  const existingPayloads = header?.fileMetadata.payloads;
  for (let i = 0; existingPayloads && i < existingPayloads.length; i++) {
    const existingPayload = existingPayloads[i];
    const payloadData = await getPayloadBytes(
      dotYouClient,
      targetDrive,
      fileId,
      existingPayload.key,
      { decrypt: true }
    );
    if (!payloadData) continue;

    payloads.push({
      key: existingPayload.key,
      payload: new OdinBlob([payloadData.bytes], { type: existingPayload.contentType }),
    });

    const existingThumbnails = existingPayload.thumbnails;
    for (let j = 0; j < existingThumbnails.length; j++) {
      const existingThumbnail = existingThumbnails[j];
      const thumbnailData = await getThumbBytes(
        dotYouClient,
        targetDrive,
        fileId,
        existingPayload.key,
        existingThumbnail.pixelWidth,
        existingThumbnail.pixelHeight,
        {}
      );
      if (thumbnailData)
        thumbnails.push({
          key: existingPayload.key,
          payload: new OdinBlob([thumbnailData.bytes], {
            type: existingThumbnail.contentType,
          }),
          pixelWidth: existingThumbnail.pixelWidth,
          pixelHeight: existingThumbnail.pixelHeight,
        });
    }
  }

  return await uploadFile(
    dotYouClient,
    instructions,
    metadata,
    payloads,
    thumbnails,
    encrypt,
    undefined,
    {
      axiosConfig,
    }
  );
};
