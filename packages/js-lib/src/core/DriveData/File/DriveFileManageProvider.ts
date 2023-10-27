import { assertIfDefined } from '../../../helpers/DataUtil';
import { DotYouClient } from '../../DotYouClient';
import { SystemFileType } from './DriveFileTypes';
import { TargetDrive } from './DriveFileTypes';

/// Delete methods:
export const deleteFile = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  deleteLinkedFiles?: boolean,
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
    deleteLinkedFiles: deleteLinkedFiles ?? true,
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

export const deleteThumbnail = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  width: number,
  height: number,
  systemFileType?: SystemFileType
) => {
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
    width,
    height,
  };

  client
    .post('/attachments/deletethumbnail', request)
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

export const deletePayload = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  width: number,
  height: number,
  systemFileType?: SystemFileType
) => {
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request = {
    key: '', // TODO: Add key (reference to a key for multiple payloads in a single file)
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  client
    .post('/attachments/deletepayload', request)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};
