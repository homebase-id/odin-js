import { OdinClient } from '../../../core/OdinClient';
import {
  GenerateKeyHeader,
  buildDescriptor,
  buildFormData,
  buildManifest,
} from '../../../core/DriveData/Upload/UploadHelpers';
import {
  UploadFileMetadata,
  ThumbnailFile,
  TransferUploadStatus,
  PayloadFile,
} from '../../../core/core';
import { TransitInstructionSet, TransitUploadResult } from '../PeerTypes';
import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
import { AxiosRequestConfig } from 'axios';

const isDebug = hasDebugFlag();

/// Upload methods
export const uploadFileOverPeer = async (
  odinClient: OdinClient,
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
      new URL(`${odinClient.getEndpoint()}/transit/sender/files/send'`).pathname,
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
    odinClient,
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

  const client = odinClient.createAxiosClient({
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
      new URL(`${odinClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      uploadResult
    );

  if (!uploadResult) return;
  uploadResult.keyHeader = keyHeader;
  return uploadResult;
};
