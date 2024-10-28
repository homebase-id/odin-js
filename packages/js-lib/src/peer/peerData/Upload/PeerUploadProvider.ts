import { DotYouClient } from '../../../core/DotYouClient';
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
  dotYouClient: DotYouClient,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  encrypt = true,
  options?: {
    axiosConfig?: AxiosRequestConfig;
    aesKey?: Uint8Array | undefined;
  }
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

  // Force isEncrypted on the metadata to match the encrypt flag
  metadata.isEncrypted = encrypt || !!options?.aesKey;

  const keyHeader = encrypt ? GenerateKeyHeader(options?.aesKey) : undefined;
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

  const axiosConfig = options?.axiosConfig || {};
  const config: AxiosRequestConfig = {
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
