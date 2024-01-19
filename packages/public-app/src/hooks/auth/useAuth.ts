import { useEffect, useState } from 'react';
import { useVerifyToken } from './useVerifyToken';
import { getEccPublicKey, logout as logoutYouauth } from '../../provider/AuthenticationProvider';
import { HOME_ROOT_PATH, logoutOwner } from '@youfoundation/common-app';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  STORAGE_IDENTITY_KEY,
  useDotYouClient,
} from '@youfoundation/common-app';
import {
  YouAuthorizationParams,
  createEccPair,
  getEccSharedSecret,
  importRemotePublicEccKey,
  retrieveEccKey,
  saveEccKey,
} from '@youfoundation/js-lib/auth';
import {
  uint8ArrayToBase64,
  stringToUint8Array,
  cbcDecrypt,
  base64ToUint8Array,
  byteArrayToString,
  tryJsonParse,
} from '@youfoundation/js-lib/helpers';

export const useAuth = () => {
  const { getDotYouClient, getIdentity, getApiType, hasSharedSecret, getSharedSecret, isOwner } =
    useDotYouClient();

  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(isOwner);

  const logout = async (): Promise<void> => {
    try {
      if (isOwner) await logoutOwner();
      else await logoutYouauth();

      window.localStorage.removeItem(STORAGE_IDENTITY_KEY);
      window.localStorage.removeItem(HOME_SHARED_SECRET);
      window.localStorage.removeItem(OWNER_SHARED_SECRET);

      setAuthenticationState('anonymous');
    } catch (e) {
      console.error('Really bad auth state', e);
    }

    window.location.href = HOME_ROOT_PATH;
  };

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');

        if (
          window.localStorage.getItem(HOME_SHARED_SECRET) ||
          (isOwner && window.localStorage.getItem(OWNER_SHARED_SECRET)) ||
          window.localStorage.getItem(STORAGE_IDENTITY_KEY)
        ) {
          // // Auth state was presumed logged in, but not allowed.. Will attempt reload page? (Browsers may ignore, as it's not a reload on user request)
          (async () => {
            console.error('kicking identity');
            await logout();
            window.location.reload();
          })();
        }
      } else {
        // We've confirmed the user is logged in, and has a valid token
        if (window.location.pathname === '/' && !document.referrer && isOwner) {
          console.debug(
            'Automatically redirected to /owner as you are logged in as owner, and open your homepage'
          );
          window.location.href = '/owner';
        }
      }
    }
  }, [hasValidToken]);

  return {
    logout,
    getIdentity,
    isOwner,
    getApiType,
    getSharedSecret,
    getDotYouClient,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export const useYouAuthAuthorization = () => {
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();
    saveEccKey(eccKey);

    const rawEccKey = await crypto.subtle.exportKey('jwk', eccKey.publicKey);
    delete rawEccKey.key_ops;
    delete rawEccKey.ext;
    const eccPk64 = uint8ArrayToBase64(stringToUint8Array(JSON.stringify(rawEccKey)));

    const finalUrl = `/authorization-code-callback`;
    const state = { finalUrl: finalUrl, eccPk64: eccPk64, returnUrl };
    const pk = await getEccPublicKey();

    return {
      client_id: window.location.hostname,
      client_type: 'domain',
      client_info: '',
      public_key: pk,
      permission_request: '',
      state: JSON.stringify(state),
      redirect_uri: `https://${window.location.hostname}/api/guest/v1/builtin/home/auth/auth-code-callback`,
    };
  };

  const finalizeAuthorization = async (
    encryptedData: string,
    remotePublicKey: string,
    salt: string,
    iv: string
  ) => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');
      const importedRemotePublicKey = await importRemotePublicEccKey(remotePublicKey);

      const exchangedSecret = new Uint8Array(
        await getEccSharedSecret(privateKey, importedRemotePublicKey, salt)
      );

      const data = await cbcDecrypt(
        base64ToUint8Array(encryptedData),
        base64ToUint8Array(iv),
        exchangedSecret
      );

      const { identity, ss64, returnUrl } = tryJsonParse<{
        identity: string;
        ss64: string;
        returnUrl: string;
      }>(byteArrayToString(data));

      // Store the sharedSecret to the localStorage
      window.localStorage.setItem(HOME_SHARED_SECRET, ss64);
      // Store the identity to the localStorage
      window.localStorage.setItem(STORAGE_IDENTITY_KEY, identity);
      // Redirect to the returnUrl; With a fallback to home
      window.location.href = returnUrl || '/';
    } catch (e) {
      console.error('Failed to finalize authorization', {
        encryptedData,
        remotePublicKey,
        salt,
        iv,
      });
    }
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};
