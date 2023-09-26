import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  authenticate as authenticateOwner,
  isPasswordSet as isPasswordSetOwner,
  setFirstPassword as setFirstOwnerPassword,
  resetPassword as resetOwnerPassword,
  changePassword as setNewOwnerPassword,
  logout as logoutOwner,
} from '../../provider/auth/AuthenticationProvider';
import { uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  STORAGE_IDENTITY_KEY,
  useDotYouClient,
} from '@youfoundation/common-app';

export const SETUP_PATH = '/owner/setup';

export const LOGIN_PATH = '/owner/login';
export const FIRSTRUN_PATH = '/owner/firstrun';
export const RECOVERY_PATH = '/owner/account-recovery';

export const RETURN_URL_PARAM = 'returnUrl';
export const HOME_PATH = '/owner';

const useAuth = () => {
  const { getDotYouClient, getApiType, getSharedSecret, hasSharedSecret } = useDotYouClient();

  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken();

  const [searchParams] = useSearchParams();

  const authenticate = async (password: string) => {
    const response = await authenticateOwner(password);

    if (!response) return false;

    window.localStorage.setItem(OWNER_SHARED_SECRET, uint8ArrayToBase64(response.sharedSecret));
    setAuthenticationState('authenticated');

    doRedirectToReturn();

    return true;
  };

  const finalizeRegistration = async (
    newPassword: string,
    firstRunToken: string
  ): Promise<void> => {
    await setFirstOwnerPassword(newPassword, firstRunToken);
  };

  const logout = async () => {
    await logoutOwner();
    setAuthenticationState('anonymous');

    window.localStorage.removeItem(OWNER_SHARED_SECRET);
    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

    window.location.href = LOGIN_PATH;
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

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (hasValidToken && hasSharedSecret) {
        // When authenticated check if on Login Pages and if so redirects to return or Home
        doRedirectToReturn();
      } else if (hasSharedSecret) {
        (async () => {
          console.error('kicking identity');
          await logout();
          window.location.reload();
        })();
      } else if (
        window.location.pathname !== LOGIN_PATH &&
        window.location.pathname !== FIRSTRUN_PATH &&
        window.location.pathname !== RECOVERY_PATH
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
    setFirstPassword: setFirstOwnerPassword,
    resetPassword: resetOwnerPassword,
    changePassword: setNewOwnerPassword,
    getDotYouClient,
    getApiType,
    finalizeRegistration,
    isPasswordSet: isPasswordSetOwner,
    logout,
    getSharedSecret,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
