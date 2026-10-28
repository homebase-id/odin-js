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
import { ApiType } from '@homebase-id/js-lib/core';
import {
  ensureZeroKnowledgeKeys,
  isVaultPrivate,
  makeVaultPrivate,
} from '../../provider/auth/ZeroKnowledgeProvider';
import {
  HOME_SHARED_SECRET,
  OwnerClient,
  OWNER_SHARED_SECRET,
  OWNER_ZK_MASTER_KEY,
  STORAGE_IDENTITY_KEY,
  logoutOwnerAndAllApps,
  logoutPublicSession,
  useDotYouClient,
} from '@homebase-id/common-app';
import { useQueryClient } from '@tanstack/react-query';
import { forgetRecoveryKey } from '../../provider/auth/SecurityRecoveryProvider';

const ZERO_KNOWLEDGE_KEYS_TIMEOUT_MS = 10_000;

export const SETUP_PATH = '/owner/setup';

export const LOGIN_PATH = '/owner/login';
export const FIRSTRUN_PATH = '/owner/firstrun';
export const RECOVERY_PATH = '/owner/account-recovery';
export const SHAMIR_RECOVERY_PATH = '/owner/shamir-account-recovery';


export const RETURN_URL_PARAM = 'returnUrl';
/**
 * Set by the server's verify link after a recovery email change (odin-core
 * SecurityVerificationController.VerifyRecoveryEmail): the login deals the recovery again.
 */
export const REDEAL_PARAM = 'redeal';
export const HOME_PATH = '/owner';

/**
 * Why the login was asked for again (REDEAL_PARAM): '1' after a recovery email change; 'app-key' for an app's
 * sign-in; 'vault-private' when the Vault app sends the owner to make Vault private, which needs the password.
 */
export const REDEAL_APP_KEY = 'app-key';
export const REDEAL_VAULT_PRIVATE = 'vault-private';
const REDEAL_REASONS = ['1', REDEAL_APP_KEY, REDEAL_VAULT_PRIVATE] as const;
export type RedealReason = (typeof REDEAL_REASONS)[number];

/** The reason the login page was asked for again, when the query names a known one. */
export const redealReasonOf = (params: URLSearchParams): RedealReason | undefined =>
  REDEAL_REASONS.find((reason) => reason === params.get(REDEAL_PARAM));

/**
 * The login page, coming back to `returnUrl` after login when there is one. `redeal`: shown even to an
 * owner who is logged in (REDEAL_PARAM).
 */
export const loginHref = (
  returnUrl: string | null,
  options?: { redeal?: boolean | typeof REDEAL_APP_KEY }
) => {
  const query = new URLSearchParams();
  if (options?.redeal) query.set(REDEAL_PARAM, options.redeal === true ? '1' : options.redeal);
  if (returnUrl) query.set(RETURN_URL_PARAM, returnUrl);
  const search = query.toString();
  return search ? `${LOGIN_PATH}?${search}` : LOGIN_PATH;
};

const AUTH_FLOW_PATHS = [
  LOGIN_PATH,
  FIRSTRUN_PATH,
  RECOVERY_PATH,
  SHAMIR_RECOVERY_PATH,
  SETUP_PATH,
];

const isAuthFlowPath = (pathname: string): boolean =>
  AUTH_FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

// Accepts path-relative URLs ("/foo") and same-origin absolute URLs
// (the backend issues those for the youauth/authorize flow).
// Rejects protocol-relative ("//evil"), backslash-prefixed ("/\evil"), cross-origin,
// and non-http schemes ("javascript:", "data:", etc).
// A returnUrl handed in by a Homebase app that launched signup and wants the user back once the
// identity is set up. Only our own custom schemes: an https target here would be an open redirect
// out of a brand-new identity, straight into a page well placed to ask for the password that was
// just chosen. Distinct from isSafeReturnUrl, which covers same-origin navigation and rejects
// every non-http scheme.
// ponytail: scheme allowlist, not a host allowlist — enough for the mobile clients. A web caller
// would need an explicit origin allowlist, which is a decision for whoever adds one.
export const isAppReturnUrl = (url: string | null | undefined): url is string =>
  !!url && /^homebase[a-z0-9-]*:\/\//i.test(url);

// A native app's loopback listener (http://localhost:{port}/…), as a desktop app receives a redirect
const isLoopbackUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
};

// The Vault app's return after making Vault private: this origin, one of our own app schemes (as the signup's),
// or a desktop app's loopback listener
const isVaultAppReturnUrl = (url: string | null | undefined): url is string =>
  isSafeReturnUrl(url) || isAppReturnUrl(url) || isLoopbackUrl(url);

export const isSafeReturnUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  if (url.startsWith('/')) {
    return url.length < 2 || (url[1] !== '/' && url[1] !== '\\');
  }
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
};

export const useValidateAuthorization = () => {
  const { hasSharedSecret } = useDotYouClient();
  const { data: hasValidToken, isFetched } = useVerifyToken();

  useEffect(() => {
    if (isFetched && hasValidToken !== undefined) {
      if (!hasValidToken && hasSharedSecret) {
        const params = new URLSearchParams(window.location.search);
        console.warn('Token is invalid, logging out..');
        const existing = params.get(RETURN_URL_PARAM);
        const safeExisting = isSafeReturnUrl(existing) ? existing : null;
        // Skip capture on auth-flow pages: those URLs may carry one-time tokens
        // (recovery `token`/`id`, etc.) that shouldn't be persisted in history.
        const captured = isAuthFlowPath(window.location.pathname)
          ? null
          : window.location.pathname + window.location.search;
        // The login page asked for again lands on itself, so its reason and an app's return survive
        const onRedealLogin = window.location.pathname === LOGIN_PATH && !!redealReasonOf(params);
        logoutOwnerAndAllApps(
          safeExisting ?? captured ?? undefined,
          onRedealLogin ? window.location.search : undefined
        );
      }
    }
  }, [hasValidToken, hasSharedSecret]);
};

export const useAuth = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const makingVaultPrivate = redealReasonOf(searchParams) === REDEAL_VAULT_PRIVATE;

  const authenticate = async (password: string) => {
    // Cleanup the public session: (There might have been a public login already in place)
    await logoutPublicSession();

    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

    const response = await authenticateOwner(password);
    if (!response) return false;
    // Only now: a wrong password on the redeal login (shown to an owner who is logged in) must leave
    // that session's key alone
    window.localStorage.removeItem(OWNER_ZK_MASTER_KEY);

    // A login ends recovery mode on the server, so a recovering browser's throwaway key is spent
    forgetRecoveryKey();

    // Store the owner items:
    window.localStorage.setItem(OWNER_SHARED_SECRET, uint8ArrayToBase64(response.sharedSecret));
    invalidateVerifyToken(queryClient);

    // The only moment the browser has the password: make or open the zero-knowledge keys. The
    // redirect waits for it, but never for long, and a failure never fails the login; the next
    // login tries again. Each step is safe to cut off: nothing is used until it is saved.
    const ownerClient = new OwnerClient({
      api: ApiType.Owner,
      sharedSecret: response.sharedSecret,
    });
    const keys = ensureZeroKnowledgeKeys(ownerClient, password);
    try {
      await Promise.race([
        keys,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timed out')), ZERO_KNOWLEDGE_KEYS_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.error('Zero-knowledge keys', error);
    }

    // The Vault app's password confirm: it needs the keys above, so it waits for them past the time limit. A
    // failure throws, so the page shows it; the owner is logged in by now and can enter the password again.
    if (makingVaultPrivate) {
      await keys.catch(() => undefined);
      if (!(await isVaultPrivate(ownerClient))) await makeVaultPrivate(ownerClient, password);
    }

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
      const allowed = makingVaultPrivate ? isVaultAppReturnUrl : isSafeReturnUrl;
      window.location.href = allowed(returnUrl) ? returnUrl : HOME_PATH;
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
