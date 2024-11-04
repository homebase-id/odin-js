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

export const deletePayloadOverPeer = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  globalTransitId: string,
  fileKey: string,
  versionTag: string,
  recipients?: string[],
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
): Promise<{ newVersionTag: string }> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GlobalTransitId', globalTransitId);
  assertIfDefined('FileKey', fileKey);

  const client = dotYouClient.createAxiosClient();

  const request = {
    fileSystemType: systemFileType || 'Standard',
    globalTransitIdFileIdentifier: {
      targetDrive: targetDrive,
      globalTransitId: globalTransitId,
    },
    key: fileKey,
    versionTag: versionTag,
    recipients: recipients,
  };

  return client
    .post('/transit/sender/files/deletepayload', request, axiosConfig)
    .then((response) => response.data)
    .catch((error) => {
      console.error('[odin-js:deleteFile]', error);
      throw error;
    });
};
