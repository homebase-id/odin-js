import { isLocalStorageAvailable } from '../../helpers/BrowserUtil';
import {
  base64ToUint8Array,
  byteArrayToString,
  tryJsonParse,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';

const STORAGE_KEY = 'ecc-pk';
const keyParams: EcKeyGenParams = {
  name: 'ECDH',
  namedCurve: 'P-384',
};

export const createEccPair = async () => {
  return await crypto.subtle.generateKey(keyParams, true, ['deriveKey']);
};

// Do something with the ECC Key;
// Get sharedSecret from local Private key and remote public key;
export const getEccSharedSecret = async (
  privateKey: CryptoKey,
  remotePublicKey: CryptoKey,
  salt: string
) => {
  // we can't directly deriveKy, because the crypto spec doesn't allow that for an HKDF key:
  // More info on this issue: https://github.com/w3c/webcrypto/issues/314
  // https://stackoverflow.com/questions/67938461/web-cryptography-implement-hkdf-for-the-output-of-ecdh

  const derivedBits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: remotePublicKey },
    privateKey,
    384
  );
  const hkdfSharedSecret = await window.crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Derive the AES Shared Secret key from the hkdfKey
  const derivedKey = await window.crypto.subtle.deriveKey(
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

  return await window.crypto.subtle.exportKey('raw', derivedKey);
};

export const importRemotePublicEccKey = async (publicKey: string) => {
  const publicKeyJWK = tryJsonParse<any>(byteArrayToString(base64ToUint8Array(publicKey)));
  return await crypto.subtle.importKey(
    'jwk',
    publicKeyJWK,
    {
      name: 'ECDH',
      namedCurve: 'P-384',
    },
    true,
    []
  );
};

export const saveEccKey = async (keyPair: CryptoKeyPair) => {
  if (typeof crypto === 'undefined' || !isLocalStorageAvailable()) return null;
  await crypto.subtle
    .exportKey('pkcs8', keyPair.privateKey)
    .then((e) => localStorage.setItem(STORAGE_KEY, uint8ArrayToBase64(new Uint8Array(e))));
};

export const retrieveEccKey = async () => {
  if (typeof crypto === 'undefined' || !isLocalStorageAvailable()) return null;
  const key = base64ToUint8Array(localStorage.getItem(STORAGE_KEY) || '');
  return await crypto.subtle
    .importKey('pkcs8', key, keyParams, true, ['deriveKey', 'deriveBits'])
    .catch((err) => {
      console.error(err);
    });
};

// Clears private key from storage
export const throwAwayTheECCKey = () => {
  if (isLocalStorageAvailable()) localStorage.removeItem(STORAGE_KEY);
};
