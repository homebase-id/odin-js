import { AxiosRequestConfig } from 'axios';
import { assertIfDefined } from '../../../helpers/DataUtil';
import { DotYouClient } from '../../DotYouClient';
import { SystemFileType } from './DriveFileTypes';
import { TargetDrive } from './DriveFileTypes';

/// Delete methods:
export const deleteFile = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  recipients?: string[],
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient({
    systemFileType,
  });

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    recipients: recipients,
  };

  return client
    .post('/drive/files/delete', request, axiosConfig)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};

export const deleteFiles = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileIds: string[],
  recipients?: string[],
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileIds', fileIds);

  const client = dotYouClient.createAxiosClient({
    systemFileType,
  });

  const request = {
    requests: fileIds.map((fileId) => ({
      file: {
        targetDrive: targetDrive,
        fileId: fileId,
      },
      recipients: recipients,
    })),
  };

  return client
    .post('/drive/files/deletefileidbatch', request, axiosConfig)
    .then((response) => {
      if (response.status === 200) return true;

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFileByGroupId]', error);
      throw error;
    });
};

export const deleteFilesByGroupId = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  groupIds: string[],
  recipients?: string[],
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GroupIds', groupIds);

  const client = dotYouClient.createAxiosClient({
    systemFileType,
  });

  const request = {
    requests: groupIds.map((groupId) => ({
      targetDrive: targetDrive,
      groupId: groupId,
      recipients: recipients,
    })),
  };

  return client
    .post('/drive/files/deletegroupidbatch', request, axiosConfig)
    .then((response) => {
      if (response.status === 200) return true;

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFileByGroupId]', error);
      throw error;
    });
};

export const deletePayload = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  versionTag: string,
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
): Promise<{ newVersionTag: string }> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('FileKey', fileKey);

  const client = dotYouClient.createAxiosClient({
    systemFileType,
  });

  const request = {
    key: fileKey,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    versionTag: versionTag,
  };

  return client
    .post('/drive/files/deletepayload', request, axiosConfig)
    .then((response) => response.data)
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};
