import { DotYouClient } from '../../../core/DotYouClient';
import {
  GenerateKeyHeader,
  buildDescriptor,
  buildFormData,
  buildManifest,
} from '../../../core/DriveData/Upload/UploadHelpers';
import { UploadFileMetadata, ThumbnailFile, TransferStatus, PayloadFile } from '../../../core/core';
import { TransitInstructionSet, TransitUploadResult } from '../PeerTypes';
import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';

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
    strippedInstructions,
    encryptedDescriptor,
    payloads,
    thumbnails,
    keyHeader,
    manifest
  );

  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const url = 'transit/sender/files/send';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
      'X-ODIN-FILE-SYSTEM-TYPE': instructions.systemFileType || 'Standard',
    },
  };

  const response = await client
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
