import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { invalidateVerifyToken, useVerifyToken } from './useVerifyToken';
import {
  authenticate as authenticateOwner,
  isPasswordSet as isPasswordSetOwner,
  setFirstPassword as setFirstOwnerPassword,
  resetPassword as resetOwnerPassword,
  changePassword as setNewOwnerPassword, canUseAutoRecovery,
} from '../../provider/auth/AuthenticationProvider';
import { uint8ArrayToBase64 } from '@homebase-id/js-lib/helpers';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  STORAGE_IDENTITY_KEY,
  logoutOwnerAndAllApps,
  logoutPublicSession,
  useDotYouClient,
} from '@homebase-id/common-app';
import { useQueryClient } from '@tanstack/react-query';

export const SETUP_PATH = '/owner/setup';

export const LOGIN_PATH = '/owner/login';
export const FIRSTRUN_PATH = '/owner/firstrun';
export const RECOVERY_PATH = '/owner/account-recovery';
export const SHAMIR_RECOVERY_PATH = '/owner/shamir-account-recovery';


export const RETURN_URL_PARAM = 'returnUrl';
export const HOME_PATH = '/owner';

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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const authenticate = async (password: string) => {
    // Cleanup the public session: (There might have been a public login already in place)
    await logoutPublicSession();

    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

    const response = await authenticateOwner(password);
    if (!response) return false;

    // Store the owner items:
    window.localStorage.setItem(OWNER_SHARED_SECRET, uint8ArrayToBase64(response.sharedSecret));
    invalidateVerifyToken(queryClient);

    checkRedirectToReturn();
    return true;
  };

  const finalizeRegistration = async (
    newPassword: string,
    firstRunToken: string
  ): Promise<void> => {
    await setFirstOwnerPassword(newPassword, firstRunToken);
  };

  // Redirects back to returnUrls; Explicitly uses window navigation to ensure that the anonymous state doesn't stick on the rootRoute
  const checkRedirectToReturn = () => {
    if (window.location.pathname === LOGIN_PATH || window.location.pathname === FIRSTRUN_PATH) {
      const returnUrl = searchParams.get(RETURN_URL_PARAM);
      window.location.href = returnUrl || HOME_PATH;
    }
  };

  return {
    authenticate,
    checkRedirectToReturn,
    setFirstPassword: setFirstOwnerPassword,
    resetPassword: resetOwnerPassword,
    changePassword: setNewOwnerPassword,
    finalizeRegistration,
    isPasswordSet: isPasswordSetOwner,
    canUseAutoRecovery
  };
};

export const websocketDrives = [];
