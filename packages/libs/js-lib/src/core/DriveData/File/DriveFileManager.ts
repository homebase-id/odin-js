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
  axiosConfig?: AxiosRequestConfig,
  hardDelete?: boolean
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
    .post(`/drive/files/${hardDelete ? 'harddelete' : 'delete'}`, request, axiosConfig)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[odin-js:deleteFile]', error);
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
      console.error('[odin-js:deleteFileByGroupId]', error);
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
      console.error('[odin-js:deleteFileByGroupId]', error);
      throw error;
    });
};
