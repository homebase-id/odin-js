import { AxiosRequestConfig } from 'axios';
import { assertIfDefined } from '../../../helpers/DataUtil';
import { DotYouClient } from '../../DotYouClient';
import { getAxiosClientV2 } from './DriveFileHelper';
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

  const client = getAxiosClientV2(dotYouClient, systemFileType);

  // The empty body is only for the shared-secret interceptor to encrypt
  const fileRoot = `/drives/${targetDrive.alias}/files/${fileId}`;
  const request = hardDelete
    ? client.post(`${fileRoot}/hard-delete`, {}, axiosConfig)
    : client.post(`${fileRoot}/delete`, { recipients: recipients }, axiosConfig);

  return request
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

  const client = getAxiosClientV2(dotYouClient, systemFileType);

  const request = {
    requests: fileIds.map((fileId) => ({
      fileId: fileId,
      recipients: recipients,
    })),
  };

  return client
    .post(`/drives/${targetDrive.alias}/files/delete-batch/by-file-id`, request, axiosConfig)
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

  const client = getAxiosClientV2(dotYouClient, systemFileType);

  const request = {
    requests: groupIds.map((groupId) => ({
      groupId: groupId,
      recipients: recipients,
    })),
  };

  return client
    .post(`/drives/${targetDrive.alias}/files/delete-batch/by-group-id`, request, axiosConfig)
    .then((response) => {
      if (response.status === 200) return true;

      return false;
    })
    .catch((error) => {
      console.error('[odin-js:deleteFileByGroupId]', error);
      throw error;
    });
};
