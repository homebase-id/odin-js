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
import { base64ToUint8Array, uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
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

  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const keyPair = await createPair();
    const rawPk = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const pk = uint8ArrayToBase64(new Uint8Array(rawPk));

    saveKey(keyPair);

    const state = 'home-app-ref-id';
    // TODO: State should contain the returnUrl

    return {
      client_id: window.location.hostname,
      client_type: 'domain',
      client_info: '',
      public_key: pk,
      permission_request: '',
      state: state,
      redirect_uri: `https://${
        window.location.hostname
      }/authorization-code-callback?returnUrl=${encodeURIComponent(returnUrl)}`,
    };
  };

  const finalizeAuthorization = async (
    code: string,
    state: string,
    publicKey: string,
    salt: string
  ) => {
    console.log('Finalizing authentication');

    const privateKey = await retrieveKey();
    if (!privateKey) throw Error('No private key found');

    const deriveSecretKey = async (privateKey: any, publicKey: string) => {
      const publicKeyAsCryptoKey = await crypto.subtle.importKey(
        'spki',
        base64ToUint8Array(publicKey).buffer,
        {
          name: 'ECDH',
          namedCurve: 'P-384',
        },
        false,
        []
      );

      return window.crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: publicKeyAsCryptoKey,
        },
        privateKey,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt', 'decrypt']
      );
    };

    const exportPublicKey = async (key: CryptoKey) => {
      // Debug, show JWK and SPKI of a natively generated key
      console.log({ jwk: await crypto.subtle.exportKey('jwk', key) });
      console.log({
        spki: uint8ArrayToBase64(new Uint8Array(await crypto.subtle.exportKey('spki', key))),
      });

      return uint8ArrayToBase64(new Uint8Array(await crypto.subtle.exportKey('spki', key)));
    };

    // Generate 2 ECDH key pairs: one for Alice and one for Bob
    // In more normal usage, they would generate their key pairs
    // separately and exchange public keys securely
    let alicesKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      false,
      ['deriveKey']
    );

    let bobsKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      false,
      ['deriveKey']
    );

    // Alice then generates a secret key using her private key and Bob's public key.
    let alicesSecretKey = await deriveSecretKey(
      alicesKeyPair.privateKey,
      await exportPublicKey(bobsKeyPair.publicKey)
    );

    // Bob generates the same secret key using his private key and Alice's public key.
    let bobsSecretKey = await deriveSecretKey(
      bobsKeyPair.privateKey,
      await exportPublicKey(alicesKeyPair.publicKey)
    );

    console.log({ alicesSecretKey, bobsSecretKey });

    //TODO RSA decrypt

    // const ss = rsaEncryptedSharedSecret64;
    // window.localStorage.setItem(HOME_SHARED_SECRET, ss);

    // const decodedReturnUrl = decodeURIComponent(returnUrl);
    // const splitUpReturnUrl = decodedReturnUrl.split('?');
    // const loggedOnIdentity =
    //   splitUpReturnUrl?.length === 2 &&
    //   new URLSearchParams(splitUpReturnUrl?.[1] ?? '').get('identity');

    // console.log('will redirect to', decodedReturnUrl);

    // if (loggedOnIdentity) {
    //   localStorage.setItem(STORAGE_IDENTITY_KEY, loggedOnIdentity);
    //   window.location.href = decodedReturnUrl;

    //   return;
    // }

    // window.location.href = decodedReturnUrl;
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
