import { uint8ArrayToBase64, base64ToUint8Array } from '@youfoundation/js-lib';

const STORAGE_KEY = 'pk';
const createPair = async () => {
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

const saveKey = async (keyPair: CryptoKeyPair) => {
  await window.crypto.subtle
    .exportKey('pkcs8', keyPair.privateKey)
    .then((e) => localStorage.setItem(STORAGE_KEY, uint8ArrayToBase64(new Uint8Array(e))));
};

const retrieveKey = async () => {
  const key = base64ToUint8Array(localStorage.getItem(STORAGE_KEY) || '');
  return await window.crypto.subtle
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

export const newPair = async () => {
  const pair = await createPair();
  saveKey(pair);

  const rawPk = await crypto.subtle.exportKey('spki', pair.publicKey);
  const pk = uint8ArrayToBase64(new Uint8Array(rawPk));

  return pk;
};

// TODO: Clear primary key after use
export const decryptWithKey = async (encrypted: string) => {
  const key = await retrieveKey();

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

export const throwAwayTheKey = () => {
  localStorage.removeItem(STORAGE_KEY);
};
