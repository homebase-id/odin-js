import { DotYouClient } from '../../../core/DotYouClient';
import {
  GenerateKeyHeader,
  buildDescriptor,
  buildFormData,
  buildManifest,
  encryptMetaData,
} from '../../../core/DriveData/Upload/UploadHelpers';
import {
  UploadFileMetadata,
  ThumbnailFile,
  TransferUploadStatus,
  PayloadFile,
  EncryptedKeyHeader,
  KeyHeader,
  decryptKeyHeader,
  SystemFileType,
  FileIdentifier,
} from '../../../core/core';
import { TransitInstructionSet, TransitUploadResult } from '../PeerTypes';
import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
import { AxiosRequestConfig } from 'axios';
import { encryptKeyHeader, encryptWithSharedSecret } from '../../../core/DriveData/SecurityHelpers';

const EMPTY_KEY_HEADER: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(0)),
  aesKey: new Uint8Array(Array(16).fill(0)),
};

const isDebug = hasDebugFlag();

/// Upload methods
export const uploadFileOverPeer = async (
  dotYouClient: DotYouClient,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  encrypt = true,
  options?: {
    aesKey?: Uint8Array | undefined;
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<TransitUploadResult | void> => {
  isDebug &&
    console.debug(
      'request',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      {
        instructions,
        metadata,
      }
    );

  metadata.isEncrypted = encrypt || !!options?.aesKey;

  const keyHeader = encrypt ? GenerateKeyHeader(options?.aesKey) : undefined;
  const { systemFileType, ...strippedInstructions } = instructions;

  const manifest = buildManifest(payloads, thumbnails, encrypt);
  const instructionsWithManifest = {
    ...strippedInstructions,
    manifest,
    transferIv: instructions.transferIv || getRandom16ByteArray(),
  };

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

  const client = dotYouClient.createAxiosClient({
    overrideEncryption: true,
    systemFileType: systemFileType,
  });

  const url = '/transit/sender/files/send';
  const config = {
    ...options?.axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...options?.axiosConfig?.headers,
    },
  };

  const uploadResult = await client
    .post<TransitUploadResult>(url, data, config)
    .then((response) => {
      const recipientStatus = response.data.recipientStatus;
      Object.keys(recipientStatus).forEach((key) => {
        if (recipientStatus[key].toString().toLowerCase() === TransferUploadStatus.EnqueuedFailed) {
          throw new Error(`Recipient ${key} failed to receive file`);
        }
      });

      return response.data;
    })
    .catch((error) => {
      console.error('[odin-js:uploadFileOverPeerUsingKeyHeader]', error);
      throw error;
    });

  isDebug &&
    console.debug(
      'response',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      uploadResult
    );

  if (!uploadResult) return;
  uploadResult.keyHeader = keyHeader;
  return uploadResult;
};

export const uploadHeaderOverPeer = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  onVersionConflict?: () => Promise<void | TransitUploadResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<TransitUploadResult | void> => {
  isDebug &&
    console.debug(
      'request',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send`).pathname,
      {
        instructions,
        metadata,
      }
    );

  const plainKeyHeader = metadata.isEncrypted
    ? keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader
    : undefined;

  if (!decryptKeyHeader && metadata.isEncrypted)
    throw new Error('[odin-js] Missing existing keyHeader for appending encrypted metadata.');

  if (plainKeyHeader) {
    plainKeyHeader.iv = getRandom16ByteArray();
  }

  const { systemFileType, ...strippedInstructions } = instructions;
  if (!strippedInstructions.remoteTargetDrive) throw new Error('remoteTargetDrive is required');

  strippedInstructions.storageIntent = 'metadataOnly';
  strippedInstructions.transferIv = instructions.transferIv || getRandom16ByteArray();

  // Build package
  const encryptedMetaData = await encryptMetaData(metadata, plainKeyHeader);
  // Can't use buidDescriptor here, as it's a metadataOnly upload
  const encryptedDescriptor = await encryptWithSharedSecret(
    dotYouClient,
    {
      fileMetadata: encryptedMetaData,
      encryptedKeyHeader: {
        encryptedKeyHeader: await encryptKeyHeader(
          dotYouClient,
          plainKeyHeader ?? EMPTY_KEY_HEADER,
          instructions.transferIv
        ),
      },
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

  const client = dotYouClient.createAxiosClient({
    overrideEncryption: true,
    systemFileType: systemFileType,
  });
  const url = 'transit/sender/files/send';

  const config = {
    ...axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...axiosConfig?.headers,
    },
  };

  const response = await client
    .post<TransitUploadResult>(url, data, config)
    .then((response) => {
      const recipientStatus = response.data.recipientStatus;
      Object.keys(recipientStatus).forEach((key) => {
        if (recipientStatus[key].toString().toLowerCase() === TransferUploadStatus.EnqueuedFailed) {
          throw new Error(`Recipient ${key} failed to receive file`);
        }
      });

      return response.data;
    })
    .catch((error) => {
      console.error('[odin-js:uploadFileOverPeerUsingKeyHeader]', error);
      throw error;
    });

  isDebug &&
    console.debug(
      'response',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      response
    );

  return response;
};
