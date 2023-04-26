import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  authenticate as authenticateOwner,
  createHomeToken as createHomeTokenOwner,
  isMasterPasswordSet as isMasterPasswordSetOwner,
  setNewPassword as setNewOwnerPassword,
  logout as logoutOwner,
} from '../../provider/AuthenticationProvider';
import { uint8ArrayToBase64, base64ToUint8Array, ApiType } from '@youfoundation/js-lib';

const HOME_SHARED_SECRET = 'HSS';
const HOME_STORAGE_IDENTITY_KEY = 'identity';
const SHARED_SECRET = 'SS';

export const LOGIN_PATH = '/owner/login';
export const FIRSTRUN_PATH = '/owner/firstrun';
export const LOGIN_YOUAUTH_PATH = '/owner/login/youauth';

export const RETURN_URL_PARAM = 'returnUrl';
export const HOME_PATH = '/owner';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(SHARED_SECRET);
  return !!raw;
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken();

  const [searchParams] = useSearchParams();

  const authenticate = async (password: string) => {
    const response = await authenticateOwner(password);

    if (!response) {
      return false;
    }

    window.localStorage.setItem(SHARED_SECRET, uint8ArrayToBase64(response.sharedSecret));
    setAuthenticationState('authenticated');

    doRedirectToReturn();

    return true;
  };

  const setNewPassword = async (newPassword: string, firstRunToken: string): Promise<boolean> => {
    return setNewOwnerPassword(newPassword, firstRunToken);
  };

  const isMasterPasswordSet = async (): Promise<boolean> => {
    return isMasterPasswordSetOwner();
  };

  const finalizeRegistration = async (
    newPassword: string,
    firstRunToken: string
  ): Promise<void> => {
    // return setNewPassword(newPassword, firstRunToken).then(() => {
    //   // return finalizeRegistration(firstRunToken);
    // });
    await setNewPassword(newPassword, firstRunToken);
  };

  const createHomeToken = async (returnUrl: string): Promise<boolean> => {
    return createHomeTokenOwner(returnUrl);
  };

  const logout = async () => {
    await logoutOwner();
    setAuthenticationState('anonymous');

    window.localStorage.removeItem(SHARED_SECRET);
    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(HOME_STORAGE_IDENTITY_KEY);

    window.location.href = LOGIN_PATH;
  };

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(SHARED_SECRET);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  /// Redirects back to returnUrls; Explicitly uses window navigation to ensure that the anonymous state doesn't stick on the rootRoute
  const doRedirectToReturn = () => {
    if (window.location.pathname === LOGIN_PATH || window.location.pathname === FIRSTRUN_PATH) {
      const returnUrl = searchParams.get(RETURN_URL_PARAM);
      if (returnUrl) {
        window.location.href = returnUrl;
      } else {
        window.location.href = HOME_PATH;
      }
    }
  };

  const getApiType = () => {
    return ApiType.Owner;
  };

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (hasValidToken && hasSharedSecret()) {
        // When authenticated check if on Login Pages and if so redirects to return or Home
        doRedirectToReturn();
      } else if (
        window.location.pathname !== LOGIN_PATH &&
        window.location.pathname !== FIRSTRUN_PATH
      ) {
        // When not authenticated and not on either of the Login Pages on the Owner app => redirect to regular login
        window.location.href = `${LOGIN_PATH}?returnUrl=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
      }
    }
  }, [hasValidToken]);

  return {
    authenticate,
    createHomeToken,
    setNewPassword,
    getApiType,
    finalizeRegistration,
    isMasterPasswordSet,
    logout,
    getSharedSecret,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
