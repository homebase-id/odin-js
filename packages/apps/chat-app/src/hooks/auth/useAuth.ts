import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { useEffect } from 'react';
import { useVerifyToken } from './useVerifyToken';
import {
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  getRegistrationParams,
  preAuth as preauthApps,
  retrieveIdentity,
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
} from '@homebase-id/js-lib/network';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  CHAT_APP_ID,
  CHAT_ROOT_PATH,
  logoutOwnerAndAllApps,
  useDotYouClient,
} from '@homebase-id/common-app';
import { ChatDrive } from '../../providers/ConversationProvider';

export const useValidateAuthorization = () => {
  const { getDotYouClient, hasSharedSecret } = useDotYouClient();

  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(getDotYouClient());

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
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

export const websocketDrives = [ChatDrive];

export const drives = [
  {
    a: ChatDrive.alias,
    t: ChatDrive.type,
    n: 'Chat Drive',
    d: '',
    p: DrivePermissionType.Read + DrivePermissionType.Write + DrivePermissionType.React,
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
    a: '2612429d1c3f037282b8d42fb2cc0499',
    t: '70e92f0f94d05f5c7dcd36466094f3a5',
    n: 'Contact Drive',
    d: '',
    p: DrivePermissionType.Read,
  },
];

export const permissions = [
  AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReadConnectionRequests,
  AppPermissionType.ReadConnections,
  AppPermissionType.SendPushNotifications,
  AppPermissionType.SendIntroductions,
];

export const circleDrives = [
  {
    a: ChatDrive.alias,
    t: ChatDrive.type,
    n: 'Chat Drive',
    d: '',
    p: DrivePermissionType.Write + DrivePermissionType.React,
  },
];

export const appName = 'Homebase - Chat';
export const appId = CHAT_APP_ID;

export const useYouAuthAuthorization = () => {
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${CHAT_ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      permissions,
      undefined,
      drives,
      circleDrives,
      [CONFIRMED_CONNECTIONS_CIRCLE_ID, AUTO_CONNECTIONS_CIRCLE_ID],
      eccKey.publicKey,
      undefined,
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

      throwAwayTheECCKey();
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};
