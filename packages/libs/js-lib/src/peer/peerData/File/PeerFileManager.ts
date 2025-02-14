import { AxiosRequestConfig } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType } from '../../../core/core';
import { assertIfDefined } from '../../../helpers/DataUtil';

export const deleteFileOverPeer = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  globalTransitId: string,
  recipients?: string[],
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
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
    .post('/transit/sender/files/senddeleterequest', request, axiosConfig)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[odin-js:deleteFileOverPeer]', error);
      throw error;
    });
};
