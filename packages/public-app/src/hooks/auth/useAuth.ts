import { ApiType, DotYouClient, base64ToUint8Array } from '@youfoundation/js-lib';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  logout as logoutYouauth,
  authenticate as authenticateYouAuth,
} from '../../provider/AuthenticationProvider';
import { logout as logoutOwner } from '../../provider/OwnerAuthenticationProvider';

const HOME_SHARED_SECRET = 'HSS';
const OWNER_SHARED_SECRET = 'SS';
const STORAGE_IDENTITY_KEY = 'identity';

const _isOwner = localStorage.getItem(STORAGE_IDENTITY_KEY) === window.location.host;

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(_isOwner ? OWNER_SHARED_SECRET : HOME_SHARED_SECRET);
  return !!raw;
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(_isOwner);
  const navigate = useNavigate();

  const authenticate = (identity: string, returnUrl: string): void => {
    const strippedIdentity = identity.replace(new RegExp('^(http|https)://'), '').split('/')[0];

    authenticateYouAuth(strippedIdentity, returnUrl);
  };

  const finalizeAuthentication = (
    rsaEncryptedSharedSecret64: string | null,
    returnUrl: string | null
  ) => {
    console.log('Finalizing authentication');
    if (!rsaEncryptedSharedSecret64 || !returnUrl) {
      console.log('Missing shared secret or return url');
      return;
    }

    //TODO RSA decrypt
    const ss = rsaEncryptedSharedSecret64;
    window.localStorage.setItem(HOME_SHARED_SECRET, ss);

    const decodedReturnUrl = decodeURIComponent(returnUrl);
    const splitUpReturnUrl = decodedReturnUrl.split('?');
    const loggedOnIdentity =
      splitUpReturnUrl?.length === 2 &&
      new URLSearchParams(splitUpReturnUrl?.[1] ?? '').get('identity');

    console.log('will redirect to', decodedReturnUrl);

    if (loggedOnIdentity) {
      localStorage.setItem(STORAGE_IDENTITY_KEY, loggedOnIdentity);

      if (window.location.host === loggedOnIdentity) {
        // If owner ignore returnUrl and redirect to feed always;
        window.location.href = '/home/feed';
      } else {
        window.location.href = decodedReturnUrl;
      }
      return;
    }

    window.location.href = decodedReturnUrl;
  };

  const logout = async (): Promise<void> => {
    await logoutYouauth();

    if (_isOwner) {
      await logoutOwner();
    }

    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);
    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(OWNER_SHARED_SECRET);

    setAuthenticationState('anonymous');

    navigate('/home');
  };

  const getIdentity = () => {
    return localStorage.getItem(STORAGE_IDENTITY_KEY);
  };

  const getSharedSecret = () => {
    const raw =
      getApiType() === ApiType.YouAuth
        ? window.localStorage.getItem(HOME_SHARED_SECRET)
        : window.localStorage.getItem(OWNER_SHARED_SECRET);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getApiType = () => {
    if (_isOwner) {
      return ApiType.Owner;
    }

    return ApiType.YouAuth;
  };

  const getDotYouClient = () => {
    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: getApiType(),
    });
  };

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');

        if (
          window.localStorage.getItem(HOME_SHARED_SECRET) ||
          window.localStorage.getItem(STORAGE_IDENTITY_KEY)
        ) {
          // Auth state was presumed logged in, but not allowed.. Will attempt reload page? (Browsers may ignore, as it's not a reload on user request)
          window.localStorage.removeItem(HOME_SHARED_SECRET);
          window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

          window.location.reload();
        }
      }
    }
  }, [hasValidToken]);

  return {
    authenticate,
    finalizeAuthentication,
    logout,
    getIdentity,
    isOwner: _isOwner,
    getApiType,
    getSharedSecret,
    getDotYouClient,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
