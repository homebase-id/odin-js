import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  logout as logoutYouauth,
  authenticate as authenticateYouAuth,
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  getRegistrationParams,
  preAuth as preauthApps,
  retrieveIdentity,
} from '@youfoundation/js-lib/auth';

export const drives = [
  {
    a: '4db49422ebad02e99ab96e9c477d1e08',
    t: 'a3227ffba87608beeb24fee9b70d92a6',
    n: 'Feed',
    d: '',
    p: 3,
  },
];
export const appName = 'Odin - Feed';
export const appId = '5f887d80-0132-4294-ba40-bda79155551d';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken();
  const navigate = useNavigate();

  const authenticate = (identity: string, returnUrl: string): void => {
    const strippedIdentity = identity.replace(new RegExp('^(http|https)://'), '').split('/')[0];

    authenticateYouAuth(strippedIdentity, returnUrl, appName, appId, drives);
  };

  const finalizeAuthentication = async (
    registrationData: string | null,
    v: string | null,
    identity: string | null
  ) => {
    if (!registrationData || !v) {
      return false;
    }

    try {
      await finalizeAuthenticationYouAuth(registrationData, v, identity);
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  const logout = async (): Promise<void> => {
    await logoutYouauth();

    setAuthenticationState('anonymous');

    navigate('/');
    window.location.reload();
  };

  const preauth = async (): Promise<void> => {
    await preauthApps();
  };

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getDotYouClient = () => {
    const headers: Record<string, string> = {};
    const authToken = window.localStorage.getItem(APP_AUTH_TOKEN);
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
    getRegistrationParams: (returnUrl: string) =>
      getRegistrationParams(returnUrl, appName, appId, drives),
    authenticate,
    finalizeAuthentication,
    logout,
    preauth,
    getDotYouClient,
    getSharedSecret,
    getIdentity: retrieveIdentity,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
