import { DotYouClient } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType } from '../../../core/core';
import { assertIfDefined } from '../../../helpers/DataUtil';

export const deleteFileOverTransit = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  globalTransitId: string,
  recipients?: string[],
  systemFileType?: SystemFileType
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GlobalTransitId', globalTransitId);

  const client = dotYouClient.createAxiosClient();

  const request = {
    fileSystemType: systemFileType || 'Standard',
    globalTransitIdFileIdentifier: {
      targetDrive: targetDrive,
      globalTransitId: globalTransitId,
    },
    recipients: recipients,
  };

  return client
    .post('/transit/sender/files/senddeleterequest', request)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFileOverTransit]', error);
      throw error;
    });
};
