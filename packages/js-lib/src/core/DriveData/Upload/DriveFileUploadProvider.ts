import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { DotYouClient } from '../../DotYouClient';
import { PayloadFile, ThumbnailFile, KeyHeader, EncryptedKeyHeader } from '../File/DriveFileTypes';
import {
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
  AppendInstructionSet,
  AppendResult,
} from './DriveUploadTypes';
import { decryptKeyHeader, encryptKeyHeader, encryptWithSharedSecret } from '../SecurityHelpers';
import {
  GenerateKeyHeader,
  encryptMetaData,
  buildDescriptor,
  buildFormData,
  pureUpload,
  pureAppend,
  buildManifest,
} from './UploadHelpers';
import { getFileHeader, getPayloadBytes, getThumbBytes } from '../File/DriveFileProvider';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
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

export const uploadHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  onVersionConflict?: () => Promise<void | UploadResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UploadResult | void> => {
  isDebug &&
    console.debug('request', new URL(`${dotYouClient.getEndpoint()}/drive/files/upload`).pathname, {
      instructions,
      metadata,
    });

  const plainKeyHeader =
    keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader;

  if (!decryptKeyHeader && metadata.isEncrypted)
    throw new Error('[odin-js] Missing existing keyHeader for appending encrypted metadata.');

  if (plainKeyHeader) {
    plainKeyHeader.iv = getRandom16ByteArray();
  }

  const { systemFileType, ...strippedInstructions } = instructions;
  if (!strippedInstructions.storageOptions) throw new Error('storageOptions is required');

  strippedInstructions.storageOptions.storageIntent = 'metadataOnly';
  strippedInstructions.transferIv = instructions.transferIv || getRandom16ByteArray();

  // Build package
  const encryptedMetaData = await encryptMetaData(metadata, plainKeyHeader);
  // Can't use buidDescriptor here, as it's a metadataOnly upload
  const encryptedDescriptor = await encryptWithSharedSecret(
    dotYouClient,
    {
      fileMetadata: encryptedMetaData,
      encryptedKeyHeader: plainKeyHeader
        ? await encryptKeyHeader(
            dotYouClient,
            { aesKey: new Uint8Array(Array(16).fill(0)), iv: plainKeyHeader.iv },
            strippedInstructions.transferIv
          )
        : undefined,
    },
    strippedInstructions.transferIv
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
