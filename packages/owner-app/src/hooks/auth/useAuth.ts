import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVerifyToken } from './useVerifyToken';
import {
  authenticate as authenticateOwner,
  isPasswordSet as isPasswordSetOwner,
  setFirstPassword as setFirstOwnerPassword,
  resetPassword as resetOwnerPassword,
  changePassword as setNewOwnerPassword,
} from '../../provider/auth/AuthenticationProvider';
import { uint8ArrayToBase64 } from '@homebase-id/js-lib/helpers';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  STORAGE_IDENTITY_KEY,
  logoutOwner,
  useDotYouClient,
} from '@homebase-id/common-app';
import { clear } from 'idb-keyval';

export const SETUP_PATH = '/owner/setup';

export const LOGIN_PATH = '/owner/login';
export const FIRSTRUN_PATH = '/owner/firstrun';
export const RECOVERY_PATH = '/owner/account-recovery';

export const RETURN_URL_PARAM = 'returnUrl';
export const HOME_PATH = '/owner';

export const useAuth = () => {
  const { getDotYouClient, getApiType, getSharedSecret, hasSharedSecret } = useDotYouClient();

  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken();

  const [searchParams] = useSearchParams();

  const authenticate = async (password: string) => {
    const response = await authenticateOwner(password);
    if (!response) return false;

    // Cleanup the public items: (There might have been a public login already in place)
    // This will corrupt the publicly logged in state when the owner logs out...
    // TODO: Find a better way to handle this
    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

    // Store the owner items:
    window.localStorage.setItem(OWNER_SHARED_SECRET, uint8ArrayToBase64(response.sharedSecret));
    setAuthenticationState('authenticated');

    checkRedirectToReturn();

    return true;
  };

  const finalizeRegistration = async (
    newPassword: string,
    firstRunToken: string
  ): Promise<void> => {
    await setFirstOwnerPassword(newPassword, firstRunToken);
  };

  const logout = async (redirectPath?: string) => {
    try {
      await logoutOwner();
    } catch (e) {
      // We ignore server error states; And continue cleaning local storage
      console.warn('Error logging out from server', e);
    }
    setAuthenticationState('anonymous');

    window.localStorage.removeItem(OWNER_SHARED_SECRET);
    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

    clear();

    window.location.href = redirectPath || LOGIN_PATH;
  };

  /// Redirects back to returnUrls; Explicitly uses window navigation to ensure that the anonymous state doesn't stick on the rootRoute
  const checkRedirectToReturn = () => {
    if (window.location.pathname === LOGIN_PATH || window.location.pathname === FIRSTRUN_PATH) {
      const returnUrl = searchParams.get(RETURN_URL_PARAM);
      window.location.href = returnUrl || HOME_PATH;
    }
  };

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken && hasSharedSecret ? 'authenticated' : 'anonymous');

      if (hasValidToken && hasSharedSecret) {
        // When authenticated check if on Login Pages and if so redirects to return or Home
        checkRedirectToReturn();
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
    // logout => always uses the `logoutOwnerAndAllApps`,
    getSharedSecret,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};
