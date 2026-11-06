import { AxiosRequestConfig } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType } from '../../../core/core';
import { assertIfDefined } from '../../../helpers/DataUtil';
import { getAxiosClientV2 } from '../../../core/DriveData/File/DriveFileHelper';
import { peerDriveRootV2 } from '../PeerRoutesV2';

/// V2's send-delete action takes its body and answers in the clear ([NoSharedSecretOnRequest/OnResponse]). The
/// route names one peer, but the server reads the recipients from the body as V1 did, so the first recipient
/// stands in for the path (the caller's own identity when there are none, which the server rejects as V1 did).
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
