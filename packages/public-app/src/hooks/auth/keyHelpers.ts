import {
  isLocalStorageAvailable,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '@youfoundation/js-lib/helpers';

const STORAGE_KEY = 'pk';
const keyParams: EcKeyGenParams = {
  name: 'ECDH',
  namedCurve: 'P-384',
};

export const createPair = async () => {
  return await crypto.subtle.generateKey(keyParams, true, ['deriveKey']);
};

export const saveKey = async (keyPair: CryptoKeyPair) => {
  if (typeof crypto === 'undefined' || !isLocalStorageAvailable()) return null;
  await crypto.subtle
    .exportKey('pkcs8', keyPair.privateKey)
    .then((e) => localStorage.setItem(STORAGE_KEY, uint8ArrayToBase64(new Uint8Array(e))));
};

export const retrieveKey = async () => {
  if (typeof crypto === 'undefined' || !isLocalStorageAvailable()) return null;
  const key = base64ToUint8Array(localStorage.getItem(STORAGE_KEY) || '');
  return await crypto.subtle
    .importKey(
      'pkcs8', //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      key,
      keyParams,
      true,
      ['deriveKey']
    )
    .then(function (privateKey) {
      //returns a publicKey (or privateKey if you are importing a private key)

      return privateKey;
    })
    .catch(function (err) {
      console.error(err);
    });
};
