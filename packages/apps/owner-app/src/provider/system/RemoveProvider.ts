import { OdinClient, DriveDefinition, TargetDrive } from '@homebase-id/js-lib/core';
import { getNonce } from '../auth/AuthenticationProvider';
import { prepareAuthPassword } from '../auth/AuthenticationHelper';

export interface DriveDefinitionParam extends Omit<DriveDefinition, 'targetDriveInfo'> {
  targetDrive: TargetDrive;
}

//Handles management of the System
const root = '/security';

//api/owner/v1/security/delete-account
export const markAccountDeletion = async (odinClient: OdinClient, currentPassword: string) => {
  const noncePackage = await getNonce(odinClient);
  const currentAuthenticationPasswordReply = await prepareAuthPassword(
    currentPassword,
    noncePackage
  );

  const client = odinClient.createAxiosClient();
  const url = root + '/delete-account';

  return client.post(url, { currentAuthenticationPasswordReply }).then((response) => {
    return response.status === 200;
  });
};

//api/owner/v1/security/undelete-account
export const unmarkAccountDeletion = async (
  odinClient: OdinClient,
  currentPassword: string
) => {
  const noncePackage = await getNonce(odinClient);
  const currentAuthenticationPasswordReply = await prepareAuthPassword(
    currentPassword,
    noncePackage
  );

  const client = odinClient.createAxiosClient();
  const url = root + '/undelete-account';

  return client.post(url, { currentAuthenticationPasswordReply }).then((response) => {
    return response.status === 200;
  });
};

//api/owner/v1/security/account-status
export const accountDeletionStatus = async (odinClient: OdinClient) => {
  const client = odinClient.createAxiosClient();
  const url = root + '/account-status';

  return client.get<AccountDeletionStatus>(url).then((response) => {
    return response.data;
  });
};

export interface AccountDeletionStatus {
  plannedDeletionDate?: number;
  planId: string;
}
