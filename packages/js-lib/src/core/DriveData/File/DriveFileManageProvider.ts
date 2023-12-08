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
  systemFileType?: SystemFileType
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    recipients: recipients,
  };

  return client
    .post('/drive/files/delete', request)
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
  systemFileType?: SystemFileType
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileIds', fileIds);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
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
    .post('/drive/files/deletefileidbatch', request)
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
  systemFileType?: SystemFileType
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GroupIds', groupIds);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request = {
    requests: groupIds.map((groupId) => ({
      targetDrive: targetDrive,
      groupId: groupId,
      recipients: recipients,
    })),
  };

  return client
    .post('/drive/files/deletegroupidbatch', request)
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
  systemFileType?: SystemFileType
): Promise<{ newVersionTag: string }> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('FileKey', fileKey);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
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
    .post('/drive/files/deletepayload', request)
    .then((response) => response.data)
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};
