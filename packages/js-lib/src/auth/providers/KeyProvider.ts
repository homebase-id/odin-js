import { base64ToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';

const STORAGE_KEY = 'pk';
export const createPair = async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return pair;
};

export const decryptWithKey = async (encrypted: string, key: CryptoKey) => {
  if (!key) {
    console.error('no key found');
    return '';
  }

  return await crypto.subtle
    .decrypt({ name: 'RSA-OAEP' }, key, base64ToUint8Array(encrypted))
    .then((decrypted) => {
      return new Uint8Array(decrypted);
      // console.log('decrypted', new Uint8Array(decrypted));
    })
    .catch((err) => {
      console.error(err);
    });
};

// Saves private key of a pair
export const saveKey = async (keyPair: CryptoKeyPair) => {
  if (typeof crypto === 'undefined' || typeof localStorage === 'undefined') return null;
  await crypto.subtle
    .exportKey('pkcs8', keyPair.privateKey)
    .then((e) => localStorage.setItem(STORAGE_KEY, uint8ArrayToBase64(new Uint8Array(e))));
};

// Retrieves private key of a pair
export const retrieveKey = async () => {
  if (typeof crypto === 'undefined' || typeof localStorage === 'undefined') return null;
  const key = base64ToUint8Array(localStorage.getItem(STORAGE_KEY) || '');
  return await crypto.subtle
    .importKey(
      'pkcs8', //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      key,
      {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-256' }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      true,
      ['decrypt']
    )
    .then(function (privateKey) {
      //returns a publicKey (or privateKey if you are importing a private key)

      return privateKey;
    })
    .catch(function (err) {
      console.error(err);
    });
};

// Clears private key from storage
export const throwAwayTheKey = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
};
