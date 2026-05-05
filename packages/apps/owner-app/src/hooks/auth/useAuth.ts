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

const AUTH_FLOW_PATHS = [
  LOGIN_PATH,
  FIRSTRUN_PATH,
  RECOVERY_PATH,
  SHAMIR_RECOVERY_PATH,
  SETUP_PATH,
];

const isAuthFlowPath = (pathname: string): boolean =>
  AUTH_FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

// Only same-origin path-relative URLs are accepted, to prevent open-redirect via returnUrl.
export const isSafeReturnUrl = (url: string | null | undefined): url is string => {
  if (!url || !url.startsWith('/')) return false;
  // reject protocol-relative ("//evil.com") and backslash-prefixed ("/\evil.com") forms
  return url.length < 2 || (url[1] !== '/' && url[1] !== '\\');
};

export const useValidateAuthorization = () => {
  const { hasSharedSecret } = useDotYouClient();
  const { data: hasValidToken, isFetched } = useVerifyToken();

  useEffect(() => {
    if (isFetched && hasValidToken !== undefined) {
      if (!hasValidToken && hasSharedSecret) {
        console.warn('Token is invalid, logging out..');
        const existing = new URLSearchParams(window.location.search).get(RETURN_URL_PARAM);
        const safeExisting = isSafeReturnUrl(existing) ? existing : null;
        // Skip capture on auth-flow pages: those URLs may carry one-time tokens
        // (recovery `token`/`id`, etc.) that shouldn't be persisted in history.
        const captured = isAuthFlowPath(window.location.pathname)
          ? null
          : window.location.pathname + window.location.search;
        logoutOwnerAndAllApps(safeExisting ?? captured ?? undefined);
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
      window.location.href = isSafeReturnUrl(returnUrl) ? returnUrl : HOME_PATH;
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
