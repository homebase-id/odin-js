import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { useEffect, useState } from 'react';
import { useVerifyToken } from './useVerifyToken';
import {
  logout as logoutYouauth,
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
import { REACT_QUERY_CACHE_KEY, ROOT_PATH } from '../../app/App';
import { ALL_CONNECTIONS_CIRCLE_ID, AppPermissionType } from '@homebase-id/js-lib/network';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  COMMUNITY_APP_ID,
  useDotYouClient,
} from '@homebase-id/common-app';
import { clear } from 'idb-keyval';

export const useAuth = () => {
  const { getDotYouClient, getSharedSecret, hasSharedSecret } = useDotYouClient();

  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(getDotYouClient());

  const logout = async (): Promise<void> => {
    await logoutYouauth(getDotYouClient());

    localStorage.removeItem(APP_SHARED_SECRET);
    localStorage.removeItem(APP_AUTH_TOKEN);
    localStorage.removeItem(REACT_QUERY_CACHE_KEY);
    clear();

    setAuthenticationState('anonymous');

    window.location.href = '/owner';
  };

  const preauth = async (): Promise<void> => await preauthApps(getDotYouClient());

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');
        if (window.localStorage.getItem(APP_SHARED_SECRET)) {
          console.warn('Token is invalid, logging out..');
          // Auth state was presumed logged in, but not allowed.. Will attempt reload page?
          //  (Browsers may ignore, as it's not a reload on user request)
          logout();
        }
      }
    }
  }, [hasValidToken]);

  return {
    logout,
    preauth,
    getDotYouClient,
    getSharedSecret,
    getIdentity: retrieveIdentity,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export const drives = [
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
  {
    // Chat Drive
    a: '9ff813aff2d61e2f9b9db189e72d1a11',
    t: '66ea8355ae4155c39b5a719166b510e3',
    n: 'Chat Drive',
    d: '',
    p: DrivePermissionType.Read + DrivePermissionType.Write + DrivePermissionType.React,
  },
];

const circleDrives = [
  {
    // Chat Drive
    a: '9ff813aff2d61e2f9b9db189e72d1a11',
    t: '66ea8355ae4155c39b5a719166b510e3',
    n: 'Chat Drive',
    d: '',
    p: DrivePermissionType.Write + DrivePermissionType.React,
  },
];

export const permissions = [
  AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReadConnectionRequests,
  AppPermissionType.ReadConnections,
  AppPermissionType.SendPushNotifications,
];

export const appName = 'Homebase - Community';
export const appId = COMMUNITY_APP_ID;

export const useYouAuthAuthorization = () => {
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      permissions,
      undefined,
      drives,
      circleDrives,
      [ALL_CONNECTIONS_CIRCLE_ID],
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
