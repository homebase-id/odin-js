import { DotYouClient } from '../../../core/DotYouClient';
import { ExternalFileIdentifier, TargetDrive } from '../../../core/DriveData/File/DriveFileTypes';
import { assertIfDefined } from '../../../helpers/DataUtil';

export interface SendReadReceiptResponse {
  results: {
    file: ExternalFileIdentifier;
    status: { recipient: string; status: SendReadReceiptResponseRecipientStatus | null }[];
  }[];
}

export enum SendReadReceiptResponseRecipientStatus {
  RequestAcceptedIntoInbox = 'requestacceptedintoinbox',
  RecipientIdentityReturnedServerError = 'recipientidentityreturnedservererror',
  RecipientIdentityReturnedAccessDenied = 'recipientidentityreturnedaccessdenied',
  NotConnectedToOriginalSender = 'notconnectedtooriginalsender',
  RecipientIdentityReturnedBadRequest = 'recipientidentityreturnedbadrequest',
  SenderServerHadAnInternalError = 'senderserverhadaninternalerror',
}

export const sendReadReceipt = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileIds: string[]
): Promise<SendReadReceiptResponse> => {
  assertIfDefined('TargetDrive', targetDrive);
  const client = dotYouClient.createAxiosClient();

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
      console.error('[DotYouCore-js:sendReadReceipt]', error);
      throw error;
    });
};
