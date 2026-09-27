import { useEffect } from 'react';
import { invalidateVerifyToken, useVerifyToken } from './useVerifyToken';
import { getEccPublicKey, logoutOwnerAndAllApps, logoutPublic } from '@homebase-id/common-app';
import { HOME_SHARED_SECRET, STORAGE_IDENTITY_KEY, useDotYouClient } from '@homebase-id/common-app';
import {
  YouAuthorizationParams,
  openTokenFieldWith,
  createEccPair,
  exportEccPublicKey,
  getEccSharedSecret,
  importRemotePublicEccKey,
  retrieveEccKey,
  saveEccKey,
} from '@homebase-id/js-lib/auth';
import {
  uint8ArrayToBase64,
  stringToUint8Array,
  base64ToUint8Array,
  byteArrayToString,
  tryJsonParse,
} from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';

export const useValidateAuthorization = () => {
  const { hasSharedSecret, isOwner } = useDotYouClient();

  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(isOwner);
  const { logout } = useAuth();

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      if ((!hasValidToken && hasSharedSecret) || (!hasSharedSecret && (isOwner || hasValidToken))) {
        console.error('kicking identity');
        logout();
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
};

export const useAuth = () => {
  const { isOwner } = useDotYouClient();

  const logout = async (): Promise<void> => {
    try {
      if (isOwner) await logoutOwnerAndAllApps();
      else await logoutPublic();
    } catch (e) {
      console.error('Really bad auth state', e);
    }
  };

  return {
    logout,
    isOwner,
  };
};

export const useYouAuthAuthorization = () => {
  const queryClient = useQueryClient();

  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();
    saveEccKey(eccKey);

    const rawEccKey = await exportEccPublicKey(eccKey.publicKey);
    const eccPk64 = uint8ArrayToBase64(stringToUint8Array(rawEccKey));

    const finalUrl = `/authorization-code-callback`;
    // `cipher` in the state is for our own identity server: it seals the sign-in result for this
    // page with it (YouAuth [400]). `cipher` on the params is for the other identity: it seals the
    // token our server fetches from it with that (YouAuth [140]). Both open GCM here and there.
    const state = { finalUrl: finalUrl, eccPk64: eccPk64, returnUrl, cipher: 'aes-gcm' };
    const pk = await getEccPublicKey();

    return {
      client_id: window.location.hostname,
      client_type: 'domain',
      client_info: '',
      public_key: pk,
      permission_request: '',
      state: JSON.stringify(state),
      redirect_uri: `https://${window.location.host}/api/guest/v1/builtin/home/auth/auth-code-callback`,
      cipher: 'aes-gcm',
    };
  };

  const finalizeAuthorization = async (
    encryptedData: string,
    remotePublicKey: string,
    salt: string,
    iv: string,
    /** What the server says sealed `encryptedData`; a server that predates the field says nothing: CBC. */
    cipher?: string
  ) => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');
      const importedRemotePublicKey = await importRemotePublicEccKey(remotePublicKey);

      const exchangedSecret = new Uint8Array(
        await getEccSharedSecret(privateKey, importedRemotePublicKey, salt)
      );

      const data = await openTokenFieldWith(cipher)(
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
      invalidateVerifyToken(queryClient);
      // Redirect to the returnUrl; With a fallback to home
      window.location.href = returnUrl || '/';
    } catch (e) {
      console.error(
        'Failed to finalize authorization',
        {
          encryptedData,
          remotePublicKey,
          salt,
          iv,
          cipher,
        },
        e
      );
    }
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};
