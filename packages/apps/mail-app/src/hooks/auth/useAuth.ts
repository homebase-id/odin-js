import { DrivePermissionType, TargetDrive } from '@homebase-id/js-lib/core';
import { useEffect } from 'react';
import { invalidateVerifyToken, useVerifyToken } from './useVerifyToken';
import {
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  getRegistrationParams,
  preAuth as preauthApps,
  saveIdentity,
  createEccPair,
  YouAuthorizationParams,
  saveEccKey,
  retrieveEccKey,
  throwAwayTheECCKey,
} from '@homebase-id/js-lib/auth';
import {
  AppPermissionType,
  AUTO_CONNECTIONS_CIRCLE_ID,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  ContactConfig,
} from '@homebase-id/js-lib/network';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  logoutOwnerAndAllApps,
  MAIL_APP_ID,
  MAIL_ROOT_PATH,
  OWNER_APPS_ROOT,
  useDotYouClient,
} from '@homebase-id/common-app';
import { useQueryClient } from '@tanstack/react-query';

const MailDrive: TargetDrive = {
  alias: 'e69b5a48a663482fbfd846f3b0b143b0',
  type: '2dfecc40311e41e5a12455e925144202',
};

export const useValidateAuthorization = () => {
  const { hasSharedSecret } = useDotYouClient();
  const { data: hasValidToken, isFetched } = useVerifyToken();

  useEffect(() => {
    if (isFetched && hasValidToken !== undefined) {
      if (!hasValidToken && hasSharedSecret) {
        console.warn('Token is invalid, logging out..');
        logoutOwnerAndAllApps();
      }
    }
  }, [hasValidToken, hasSharedSecret]);
};

export const useAuth = () => {
  const { getDotYouClient } = useDotYouClient();
  const preauth = async (): Promise<void> => await preauthApps(getDotYouClient());

  return {
    preauth,
  };
};

export const websocketDrives = [MailDrive];
export const drives = [
  {
    a: MailDrive.alias,
    t: MailDrive.type,
    n: 'Mail Drive',
    d: '',
    p: DrivePermissionType.Read + DrivePermissionType.Write,
  },
  {
    // Standard profile Info
    a: '8f12d8c4933813d378488d91ed23b64c',
    t: '597241530e3ef24b28b9a75ec3a5c45c',
    n: 'Standard Profile info',
    d: '',
    p: DrivePermissionType.Read,
  },
  {
    // Contacts
    a: ContactConfig.ContactTargetDrive.alias,
    t: ContactConfig.ContactTargetDrive.type,
    n: 'Contact Drive',
    d: '',
    p: DrivePermissionType.Read + DrivePermissionType.Write,
  },
];

export const permissions = [
  AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReadConnectionRequests,
  AppPermissionType.ReadConnections,
  AppPermissionType.SendPushNotifications,
  AppPermissionType.SendIntroductions,
  AppPermissionType.ReceiveDataFromOtherIdentitiesOnMyBehalf,
];

const circleDrives = [
  {
    a: MailDrive.alias,
    t: MailDrive.type,
    n: 'Mail Drive',
    d: '',
    p: DrivePermissionType.Write,
  },
];

export const appName = 'Homebase - Mail';
export const appId = MAIL_APP_ID;

export const useYouAuthAuthorization = () => {
  const queryClient = useQueryClient();
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${MAIL_ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      permissions,
      undefined,
      drives,
      circleDrives,
      [AUTO_CONNECTIONS_CIRCLE_ID, CONFIRMED_CONNECTIONS_CIRCLE_ID],
      eccKey.publicKey,
      MAIL_ROOT_PATH.startsWith(OWNER_APPS_ROOT) ? undefined : window.location.host,
      undefined,
      returnUrl
    );
  };

  const finalizeAuthorization = async (identity: string, publicKey: string, salt: string) => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');

      const { clientAuthToken, sharedSecret } = await finalizeAuthenticationYouAuth(
        identity,
        privateKey,
        publicKey,
        salt
      );

      if (identity) saveIdentity(identity);
      localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
      localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);
      invalidateVerifyToken(queryClient);

      throwAwayTheECCKey();
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};
