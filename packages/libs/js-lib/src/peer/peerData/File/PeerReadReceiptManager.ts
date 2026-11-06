import { DotYouClient } from '../../../core/DotYouClient';
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

interface SendReadReceiptResultV2 {
  results: {
    fileId: string;
    status: { recipient: string; status: SendReadReceiptResponseRecipientStatus | null }[];
  }[];
}

/// V2 names the drive (its id is the V1 alias) in the route and takes bare file ids; its results carry the file id
/// only, so the drive is put back to keep V1's response shape
export const sendReadReceipt = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileIds: string[]
): Promise<SendReadReceiptResponse> => {
  assertIfDefined('TargetDrive', targetDrive);
  const client = dotYouClient.createAxiosClient({ v2: true });

  return client
    .post<SendReadReceiptResultV2>(`/drives/${targetDrive.alias}/files/send-read-receipt-batch`, {
      files: fileIds,
    })
    .then((response) => ({
      results: response.data.results.map((result) => ({
        file: { targetDrive, fileId: result.fileId },
        status: result.status,
      })),
    }))
    .catch((error) => {
      console.error('[odin-js:sendReadReceipt]', error);
      throw error;
    });
};
