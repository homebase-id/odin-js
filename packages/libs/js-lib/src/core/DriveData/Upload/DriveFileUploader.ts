import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { assertIfDotYouClientIsOwnerOrApp, DotYouClient } from '../../DotYouClient';
import {
  PayloadFile,
  ThumbnailFile,
  KeyHeader,
  EncryptedKeyHeader,
  LocalAppData,
  FileIdFileIdentifier,
  HomebaseFile,
  TargetDrive,
} from '../File/DriveFileTypes';
import {
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
  UpdateResult,
  UpdateInstructionSet,
} from './DriveUploadTypes';
import { decryptKeyHeader, encryptWithKeyheader } from '../SecurityHelpers';
import {
  GenerateKeyHeader,
  buildDescriptor,
  buildFormData,
  pureUpload,
  buildManifest,
  pureUpdate,
  buildUpdateManifest,
} from './UploadHelpers';
import { getFileHeader, getPayloadBytes, getThumbBytes } from '../File/DriveFileProvider';
import {
  base64ToUint8Array,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '../../../helpers/DataUtil';
import { AxiosRequestConfig } from 'axios';
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

  if (!instructions.storageOptions?.overwriteFileId && metadata.versionTag) {
    console.warn('VersionTag is set but no overwriteFileId is provided. You will run into issues since the uniqueId is not used to identify the file for update anymore.');
  }

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
): Promise<UpdateResult | void> => {
  isDebug &&
    console.debug('request', new URL(`${dotYouClient.getEndpoint()}/drive/files/update`).pathname, {
      instructions,
      metadata,
      payloads,
      thumbnails,
      toDeletePayloads,
    });

  const decryptedKeyHeader =
    keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader;

  if (decryptedKeyHeader) {
    // Generate a new IV for the keyHeader
    decryptedKeyHeader.iv = getRandom16ByteArray();
  }

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

export interface LocalMetadataUploadResult {
  newLocalVersionTag: string;
}

export const uploadLocalMetadataTags = async (
  dotYouClient: DotYouClient,
  file: FileIdFileIdentifier,
  localAppData: LocalAppData,
  onVersionConflict?: () => Promise<void | LocalMetadataUploadResult> | void
) => {
  assertIfDotYouClientIsOwnerOrApp(dotYouClient);
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .patch<LocalMetadataUploadResult>('/drive/files/update-local-metadata-tags', {
      localVersionTag: localAppData.versionTag,
      file: file,
      tags: localAppData.tags,
    })
    .then((response) => response.data)
    .catch((error) => {
      if (error.response?.data?.errorCode === 'versionTagMismatch') {
        if (!onVersionConflict) {
          console.warn('VersionTagMismatch, to avoid this, add an onVersionConflict handler');
        } else {
          return onVersionConflict();
        }
      }

      if (error.response?.status === 400)
        console.error('[odin-js:uploadLocalMetadataTags]', error.response?.data);
      else console.error('[odin-js:uploadLocalMetadataTags]', error);
      throw error;
    });
};

export const uploadLocalMetadataContent = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  file: HomebaseFile<unknown, unknown>,
  localAppData: LocalAppData<unknown>,
  onVersionConflict?: () => Promise<void | LocalMetadataUploadResult> | void
) => {
  assertIfDotYouClientIsOwnerOrApp(dotYouClient);
  const axiosClient = dotYouClient.createAxiosClient();

  const fileIdentifier: FileIdFileIdentifier = {
    fileId: file.fileId,
    targetDrive,
  };

  const decryptedKeyHeader = file.sharedSecretEncryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, file.sharedSecretEncryptedKeyHeader)
    : undefined;

  if (file.fileMetadata.isEncrypted && !decryptedKeyHeader) {
    throw new Error('Missing keyHeader for encrypted file');
  }

  const keyHeader: KeyHeader | undefined =
    file.fileMetadata.isEncrypted && decryptedKeyHeader
      ? {
        aesKey: decryptedKeyHeader.aesKey,
        iv: (localAppData.iv && base64ToUint8Array(localAppData.iv)) || getRandom16ByteArray(),
      }
      : undefined;

  const ivToSend = (keyHeader?.iv && uint8ArrayToBase64(keyHeader.iv)) || undefined;
  const encryptedContent =
    keyHeader && localAppData.content
      ? uint8ArrayToBase64(
        await encryptWithKeyheader(
          stringToUint8Array(
            typeof localAppData.content === 'string'
              ? localAppData.content
              : jsonStringify64(localAppData.content)
          ),
          keyHeader
        )
      )
      : localAppData.content;

  return await axiosClient
    .patch<LocalMetadataUploadResult>('/drive/files/update-local-metadata-content', {
      iv: ivToSend,
      localVersionTag: localAppData.versionTag,
      file: fileIdentifier,
      content: encryptedContent,
    })
    .then((response) => response.data)
    .catch((error) => {
      if (error.response?.data?.errorCode === 'versionTagMismatch') {
        if (!onVersionConflict) {
          console.warn('VersionTagMismatch, to avoid this, add an onVersionConflict handler');
        } else {
          return onVersionConflict();
        }
      }

      if (error.response?.status === 400)
        console.error('[odin-js:uploadLocalMetadataContent]', error.response?.data);
      else console.error('[odin-js:uploadLocalMetadataContent]', error);
      throw error;
    });
};
