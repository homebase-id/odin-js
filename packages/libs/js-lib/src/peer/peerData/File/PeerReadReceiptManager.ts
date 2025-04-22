import { OdinClient } from '../../../core/OdinClient';
import { FileIdFileIdentifier, TargetDrive } from '../../../core/DriveData/File/DriveFileTypes';
import { assertIfDefined } from '../../../helpers/DataUtil';

export interface SendReadReceiptResponse {
  results: {
    file: FileIdFileIdentifier;
    status: { recipient: string; status: SendReadReceiptResponseRecipientStatus | null }[];
  }[];
}

export enum SendReadReceiptResponseRecipientStatus {
  NotConnectedToOriginalSender = 'notconnectedtooriginalsender',
  FileDoesNotExist = 'filedoesnotexist',
  FileDoesNotHaveSender = 'filedoesnothavesender',
  MissingGlobalTransitId = 'missingglobaltransitid',
  Enqueued = 'enqueued',
}

export const sendReadReceipt = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  fileIds: string[]
): Promise<SendReadReceiptResponse> => {
  assertIfDefined('TargetDrive', targetDrive);
  const client = odinClient.createAxiosClient();

  const request = {
    files: fileIds.map((fileId) => ({
      targetDrive: targetDrive,
      fileId: fileId,
    })),
  };

  return client
    .post<SendReadReceiptResponse>('/drive/files/send-read-receipt', request)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error('[odin-js:sendReadReceipt]', error);
      throw error;
    });
};
