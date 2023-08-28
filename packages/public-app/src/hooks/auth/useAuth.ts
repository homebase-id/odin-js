import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import { getEccPublicKey, logout as logoutYouauth } from '../../provider/AuthenticationProvider';
import { HOME_ROOT_PATH, logoutOwner } from '@youfoundation/common-app';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  STORAGE_IDENTITY_KEY,
  useDotYouClient,
} from '@youfoundation/common-app';

export interface YouAuthorizationParams {
  client_id: string;
  client_type: string;
  client_info: string;
  public_key: string;
  permission_request: string;
  state: string;
  redirect_uri: string;
}

const useAuth = () => {
  const { getDotYouClient, getApiType, hasSharedSecret, getSharedSecret, isOwner } =
    useDotYouClient();

  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(isOwner);
  const navigate = useNavigate();

  // TODO: Move to separate hook
  // TODO: Cleanup
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    // TODO: Add public key for the encryption of the eventuals shared secret:

    // const keyPair = await createPair();
    // const rawPk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    // delete rawPk.key_ops;
    // delete rawPk.ext;
    // const pk = uint8ArrayToBase64(stringToUint8Array(JSON.stringify(rawPk)));
    // saveKey(keyPair);

    // TODO: returnUrl needs to be passed in the state, so it can be used in the callback
    const finalUrl = `/authorization-code-callback`;
    const state = { finalUrl: finalUrl, eccPk64: undefined };
    const pk = await getEccPublicKey();

    return {
      client_id: window.location.hostname,
      client_type: 'domain',
      client_info: '',
      public_key: pk,
      permission_request: '',
      state: JSON.stringify(state),
      redirect_uri: `https://${window.location.hostname}/api/youauth/v1/auth/auth-code-callback`,
    };
  };

  // TODO: Add a processing state, so the request is only done once;
  // TODO: Move to separate hook
  // TODO: Cleanup
  const finalizeAuthorization = async (identity: string, sharedSecret: string) => {
    console.log('Finalizing authentication', { identity, sharedSecret });

    // TODO: Should become:
    // Read the encrypted sharedSecret from the queryString
    // Decrypt the sharedSecret with the private key

    // Store the sharedSecret to the localStorage
    window.localStorage.setItem(HOME_SHARED_SECRET, sharedSecret);
    // Store the identity to the localStorage
    window.localStorage.setItem(STORAGE_IDENTITY_KEY, identity);

    // Redirect to the returnUrl; With a fallback to home
    window.location.href = '/';
  };

  const logout = async (): Promise<void> => {
    if (isOwner) {
      await logoutOwner();
    } else {
      await logoutYouauth();
    }

    window.localStorage.removeItem(STORAGE_IDENTITY_KEY);
    window.localStorage.removeItem(HOME_SHARED_SECRET);
    window.localStorage.removeItem(OWNER_SHARED_SECRET);

    setAuthenticationState('anonymous');

    navigate(HOME_ROOT_PATH);
  };

  const getIdentity = () => {
    return localStorage.getItem(STORAGE_IDENTITY_KEY);
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
          console.error('kicked identity');

          // Auth state was presumed logged in, but not allowed.. Will attempt reload page? (Browsers may ignore, as it's not a reload on user request)
          window.localStorage.removeItem(HOME_SHARED_SECRET);
          window.localStorage.removeItem(STORAGE_IDENTITY_KEY);

          window.location.reload();
        }
      }
    }
  }, [hasValidToken]);

  return {
    getAuthorizationParameters,
    finalizeAuthorization,
    logout,
    getIdentity,
    isOwner,
    getApiType,
    getSharedSecret,
    getDotYouClient,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
