import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
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
} from '@youfoundation/js-lib/auth';
import { ROOT_PATH } from '../../app/App';
import { AppPermissionLevels, DrivePermissionType } from '@youfoundation/js-lib/network';

export const drives = [
  {
    a: '4db49422ebad02e99ab96e9c477d1e08',
    t: 'a3227ffba87608beeb24fee9b70d92a6',
    n: 'Feed',
    d: '',
    p: DrivePermissionType.Reader,
  },
  {
    // Standard profile Info
    a: '8f12d8c4933813d378488d91ed23b64c',
    t: '597241530e3ef24b28b9a75ec3a5c45c',
    n: '',
    d: '',
    p: DrivePermissionType.Reader,
  },
  {
    // Homepage Config
    a: 'ec83345af6a747d4404ef8b0f8844caa',
    t: '597241530e3ef24b28b9a75ec3a5c45c',
    n: '',
    d: '',
    p: DrivePermissionType.Reader,
  },
  {
    // Public posts
    a: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
    t: '8f448716e34cedf9014145e043ca6612',
    n: '',
    d: '',
    p: DrivePermissionType.Editor,
  },
];
export const appName = 'Odin - Feed';
export const appId = '5f887d80-0132-4294-ba40-bda79155551d';

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const navigate = useNavigate();

  const logout = async (): Promise<void> => {
    await logoutYouauth(getDotYouClient());

    localStorage.removeItem(APP_SHARED_SECRET);
    localStorage.removeItem(APP_AUTH_TOKEN);
    setAuthenticationState('anonymous');

    navigate('/');
    window.location.reload();
  };

  const preauth = async (): Promise<void> => {
    await preauthApps(getDotYouClient());
  };

  const getAppAuthToken = () => window.localStorage.getItem(APP_AUTH_TOKEN);

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) return base64ToUint8Array(raw);
  };

  const getDotYouClient = () => {
    const headers: Record<string, string> = {};
    const authToken = getAppAuthToken();
    if (authToken) {
      headers['bx0900'] = authToken;
    }

    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: ApiType.App,
      identity: retrieveIdentity(),
      headers: headers,
    });
  };

  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(getDotYouClient());

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');
        if (window.localStorage.getItem(APP_SHARED_SECRET)) {
          console.log('Token is invalid, logging out..');
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
      [
        AppPermissionLevels.ReadConnections,
        AppPermissionLevels.ManageConnectionRequests,
        AppPermissionLevels.ReadCircleMembers,
        AppPermissionLevels.ReadWhoIFollow,
        AppPermissionLevels.ReadMyFollowers,
        AppPermissionLevels.SendDataToOtherIdentitiesOnMyBehalf,
        AppPermissionLevels.ReceiveDataFromOtherIdentitiesOnMyBehalf,
      ],
      undefined,
      drives,
      undefined,
      eccKey.publicKey,
      window.location.host,
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

export default useAuth;
