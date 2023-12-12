import { DotYouClient, assertIfDotYouClientIsOwner } from '../../../core/DotYouClient';
import {
  GenerateKeyHeader,
  encryptMetaData,
  buildDescriptor,
  buildFormData,
} from '../../../core/DriveData/Upload/UploadHelpers';
import {
  KeyHeader,
  UploadFileMetadata,
  ThumbnailFile,
  TransferStatus,
  PayloadFile,
} from '../../../core/core';
import { TransitInstructionSet, TransitUploadResult } from '../TransitTypes';
import { hasDebugFlag } from '../../../helpers/BrowserUtil';

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
  const response = await uploadFileOverPeerUsingKeyHeader(
    dotYouClient,
    keyHeader,
    instructions,
    metadata,
    payloads,
    thumbnails
  );

  isDebug &&
    console.debug(
      'response',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      response
    );

  return response;
};

const failedTransferStatuses = [
  TransferStatus?.FileDoesNotAllowDistribution.toString().toLowerCase(),
  TransferStatus?.RecipientReturnedAccessDenied.toString().toLowerCase(),
  TransferStatus?.TotalRejectionClientShouldRetry.toString().toLowerCase(),
];

export const uploadFileOverPeerUsingKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[]
): Promise<TransitUploadResult> => {
  assertIfDotYouClientIsOwner(dotYouClient);
  const strippedInstructions: TransitInstructionSet = {
    transferIv: instructions.transferIv,
    overwriteGlobalTransitFileId: instructions.overwriteGlobalTransitFileId,
    remoteTargetDrive: instructions.remoteTargetDrive,
    schedule: instructions.schedule,
    recipients: instructions.recipients,
  };

  const encryptedMetaData = await encryptMetaData(metadata, keyHeader);
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    keyHeader,
    instructions,
    encryptedMetaData
  );

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    payloads,
    thumbnails,
    keyHeader
  );

  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const url = 'transit/sender/files/send';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
      'X-ODIN-FILE-SYSTEM-TYPE': instructions.systemFileType || 'Standard',
    },
  };

  return client
    .post<TransitUploadResult>(url, data, config)
    .then((response) => {
      const recipientStatus = response.data.recipientStatus;
      Object.keys(recipientStatus).forEach((key) => {
        if (failedTransferStatuses.includes(recipientStatus[key].toLowerCase()))
          throw new Error(`Recipient ${key} failed to receive file`);
      });

      return response.data;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:uploadFileOverPeerUsingKeyHeader]', error);
      throw error;
    });
};
