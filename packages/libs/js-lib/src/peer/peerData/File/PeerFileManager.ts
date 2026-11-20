import { AxiosRequestConfig } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType } from '../../../core/core';
import { assertIfDefined } from '../../../helpers/DataUtil';
import { getAxiosClientV2 } from '../../../core/DriveData/File/DriveFileHelper';
import { peerDriveRootV2 } from '../PeerRoutesV2';

/// The server reads the recipients from the body, so the first one only stands in for the path
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

  const client = getAxiosClientV2(dotYouClient, systemFileType, { noSharedSecret: true });

  const request = {
    fileSystemType: systemFileType || 'Standard',
    globalTransitIdFileIdentifier: {
      targetDrive: targetDrive,
      globalTransitId: globalTransitId,
    },
    recipients: recipients,
  };

  return client
    .post(
      `${peerDriveRootV2(recipients?.[0] ?? dotYouClient.getHostIdentity(), targetDrive.alias)}/files/senddeleterequest`,
      request,
      axiosConfig
    )
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
