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
  TargetDrive,
} from '../../../core/core';
import { TransitInstructionSet, TransitUploadResult } from '../PeerTypes';
import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
import { AxiosRequestConfig } from 'axios';
import { encryptKeyHeader, encryptWithSharedSecret } from '../../../core/DriveData/SecurityHelpers';

const isDebug = hasDebugFlag();

/// Upload methods
export const uploadFileOverPeer = async (
  dotYouClient: DotYouClient,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  encrypt = true
) => {
  isDebug &&
    console.debug(
      'request',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      {
        instructions,
        metadata,
      }
    );

  const keyHeader = encrypt ? GenerateKeyHeader() : undefined;
  const strippedInstructions: TransitInstructionSet = {
    transferIv: instructions.transferIv,
    overwriteGlobalTransitFileId: instructions.overwriteGlobalTransitFileId,
    remoteTargetDrive: instructions.remoteTargetDrive,
    schedule: instructions.schedule,
    recipients: instructions.recipients,
  };

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
    systemFileType: instructions.systemFileType,
  });
  const url = 'transit/sender/files/send';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
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
      console.error('[DotYouCore-js:uploadFileOverPeerUsingKeyHeader]', error);
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

  const plainKeyHeader =
    keyHeader && 'encryptionVersion' in keyHeader
      ? await decryptKeyHeader(dotYouClient, keyHeader)
      : keyHeader;

  if (!decryptKeyHeader && metadata.isEncrypted)
    throw new Error('[DotYouCore-JS] Missing existing keyHeader for appending encrypted metadata.');

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
      console.error('[DotYouCore-js:uploadFileOverPeerUsingKeyHeader]', error);
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

export interface PeerAppendInstructionSet {
  targetFile: {
    fileId?: string;
    globalTransitId: string;
    drive: TargetDrive;
  };
  recipients: string[];
  versionTag: string | undefined;
  systemFileType?: SystemFileType;
}

export interface PeerAppendResult {
  recipientStatus: { [key: string]: TransferUploadStatus };
  newVersionTag: string;
}

export const appendDataToFileOverPeer = async (
  dotYouClient: DotYouClient,
  keyHeader: EncryptedKeyHeader | KeyHeader | undefined,
  instructions: PeerAppendInstructionSet,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  onVersionConflict?: () => Promise<void | PeerAppendResult> | void,
  axiosConfig?: AxiosRequestConfig
) => {
  isDebug &&
    console.debug(
      'request',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/uploadpayload`).pathname,
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

  const client = dotYouClient.createAxiosClient({
    overrideEncryption: true,
    systemFileType: systemFileType,
  });
  const url = 'transit/sender/files/uploadpayload';

  const config = {
    ...axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...axiosConfig?.headers,
    },
  };

  const response = await client
    .post<PeerAppendResult>(url, data, config)
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
      console.error('[DotYouCore-js:appendDataToFileOverPeer]', error);
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
