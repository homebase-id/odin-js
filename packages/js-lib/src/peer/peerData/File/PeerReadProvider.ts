import { DotYouClient } from '../../../core/DotYouClient';
import { TargetDrive } from '../../../core/DriveData/File/DriveFileTypes';
import { assertIfDefined } from '../../../helpers/DataUtil';

export const sendReadReceipt = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileIds: string[]
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  const client = dotYouClient.createAxiosClient();

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileIds[0],
    },
  };

  return client
    .post('/drive/files/send-read-receipt', request)
    .then((response) => {
      if (response.status === 200) return true;
      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:sendReadReceipt]', error);
      throw error;
    });
};
