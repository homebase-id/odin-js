import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import { logout as logoutYouauth } from '../../provider/AuthenticationProvider';
import { HOME_ROOT_PATH, logoutOwner } from '@youfoundation/common-app';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  STORAGE_IDENTITY_KEY,
  useDotYouClient,
} from '@youfoundation/common-app';
import {
  base64ToUint8Array,
  byteArrayToString,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@youfoundation/js-lib/helpers';
import { createPair, retrieveKey, saveKey } from './keyHelpers';

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
    const keyPair = await createPair();
    const rawPk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    delete rawPk.key_ops;
    delete rawPk.ext;
    const pk = uint8ArrayToBase64(stringToUint8Array(JSON.stringify(rawPk)));

    saveKey(keyPair);

    const state = encodeURIComponent(returnUrl);
    // TODO: State should contain the returnUrl

    return {
      client_id: window.location.hostname,
      client_type: 'domain',
      client_info: '',
      public_key: pk,
      permission_request: '',
      state: state,
      redirect_uri: `https://${window.location.hostname}/authorization-code-callback`,
    };
  };

  // TODO: Add a processing state, so the request is only done once;
  // TODO: Move to separate hook
  // TODO: Cleanup
  const finalizeAuthorization = async (
    identity: string,
    code: string,
    state: string,
    publicKey: string,
    salt: string
  ) => {
    console.log('Finalizing authentication');

    const privateKey = await retrieveKey();
    if (!privateKey) throw Error('No private key found');

    const publicKeyJWK = JSON.parse(byteArrayToString(base64ToUint8Array(publicKey)));

    // Import the remote public key
    const importedRemotePublicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJWK,
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      []
    );

    // Derive the hkdfKey fromt the remote public key and the local private key
    let hkdfSharedSecret = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: importedRemotePublicKey,
      },
      privateKey,
      {
        name: 'HKDF',
      },
      false,
      ['deriveKey']
    );

    // Derive the AES Shared Secret key from the hkdfKey
    let derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: base64ToUint8Array(salt),
        info: new Uint8Array([]),
      },
      hkdfSharedSecret,
      {
        name: 'AES-CBC',
        length: 128,
      },
      true,
      ['encrypt', 'decrypt']
    );

    let exchangedSecret = await window.crypto.subtle.exportKey('raw', derivedKey);

    const exchangedSecretDigest = await crypto.subtle.digest('SHA-256', exchangedSecret);
    const base64ExchangedSecretDigest = uint8ArrayToBase64(new Uint8Array(exchangedSecretDigest));

    const dotYouClient = getDotYouClient();
    const axiosClient = dotYouClient.createAxiosClient({ overrideEncryption: true });
    const tokenResponse = await axiosClient.post(
      '/api/owner/v1/youauth/token',
      {
        code: code,
        token_delivery_option: 'cookie',
        secret_digest: base64ExchangedSecretDigest,
      },
      {
        baseURL: `https://${identity}`,
      }
    );

    console.log({ tokenResponse });
    console.log('redirecting to', decodeURIComponent(state));

    // TODO: how to set the cookie and get the sharedSecret?
    // TODO: use state to get the final redirectUri and redirect there
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
          console.log('kicked identity');

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
