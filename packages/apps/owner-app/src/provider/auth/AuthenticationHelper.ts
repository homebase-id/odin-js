import {
  createEccPair,
  getEccSharedSecret,
  importRemotePublicEccKey,
  aesGcmEncryptWithEccSharedSecret,
  exportEccPublicKey,
} from '@homebase-id/js-lib/auth';
import {
  getRandom16ByteArray,
  base64ToUint8Array,
  cbcEncrypt,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';

export interface NonceData {
  crc: number;
  id: string;
  nonce64: string;
  publicJwk: string;
  saltKek64: string;
  saltPassword64: string;
}

export interface PublicKeyData {
  publicKey: string;
  crc32: number;
  expiration: number;
}

interface AuthenticationReplyNonce {
  nonce64: string;
  nonceHashedPassword64: string;
  crc: number;
  gcmEncrypted64: string;
  publicKeyJwk: string;
}

interface AuthenticationPayload {
  hpwd64: string;
  kek64: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret: any;
}

export const prepareAuthPassword = async (
  password: string,
  nonceData: NonceData
): Promise<AuthenticationReplyNonce> => {
  const interations = 100000;
  const len = 16;

  const hashedPassword64 = await wrapPbkdf2HmacSha256(
    password,
    nonceData.saltPassword64,
    interations,
    len
  );
  const keK64 = await wrapPbkdf2HmacSha256(password, nonceData.saltKek64, interations, len);

  const hashNoncePassword64 = await wrapPbkdf2HmacSha256(
    hashedPassword64,
    nonceData.nonce64,
    interations,
    len
  );

  const hostBase64PublicJWK = uint8ArrayToBase64(stringToUint8Array(nonceData.publicJwk));

  const clientEccKey = await createEccPair();
  const privateKey = clientEccKey.privateKey;

  const hostEccPublicKey = await importRemotePublicEccKey(hostBase64PublicJWK);
  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(privateKey, hostEccPublicKey, nonceData.nonce64)
  );

  const payload: AuthenticationPayload = {
    hpwd64: hashedPassword64,
    kek64: keK64,
    secret: uint8ArrayToBase64(getRandom16ByteArray()),
  };
  const encryptable = JSON.stringify(payload);
  const encryptedGcm = await aesGcmEncryptWithEccSharedSecret(
    exchangedSecret,
    base64ToUint8Array(nonceData.nonce64),
    stringToUint8Array(encryptable)
  );

  return {
    nonce64: nonceData.nonce64,
    nonceHashedPassword64: hashNoncePassword64,
    crc: nonceData.crc,
    gcmEncrypted64: uint8ArrayToBase64(encryptedGcm),
    publicKeyJwk: await exportEccPublicKey(clientEccKey.publicKey),
  };
};

export const encryptRecoveryKey = async (recoveryKey: string, publicKey: PublicKeyData) => {
  const cryptoKey = await rsaImportKey(publicKey.publicKey);
  const keyHeader = getRandom16ByteArray();
  const iv = getRandom16ByteArray();

  const combined = [...Array.from(iv), ...Array.from(keyHeader)];
  return {
    rsaEncryptedKeyHeader: uint8ArrayToBase64(
      await rsaOaepEncrypt(cryptoKey, new Uint8Array(combined))
    ),
    keyHeaderEncryptedData: uint8ArrayToBase64(
      await cbcEncrypt(stringToUint8Array(recoveryKey), iv, keyHeader)
    ),
    crc32: publicKey.crc32,
  };
};

// ================== PBKDF ==================
/**
 * @param {string} strPassword The clear text password
 * @param {Uint8Array} salt    The salt
 * @param {string} hash        The Hash model, e.g. ["SHA-256" | "SHA-512"]
 * @param {int} iterations     Number of iterations
 * @param {int} len            The output length in bytes, e.g. 16
 */
const pbkdf2 = async (
  strPassword: string,
  salt: Uint8Array,
  hash: string,
  iterations: number,
  len: number
): Promise<Uint8Array> => {
  const ik = await crypto.subtle.importKey(
    'raw',
    stringToUint8Array(strPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const dk = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: hash,
      salt: salt,
      iterations: iterations,
    },
    ik,
    len * 8
  ); // Bytes to bits

  return new Uint8Array(dk);
};

const wrapPbkdf2HmacSha256 = async (
  password: string,
  saltArray64: string,
  iterations: number,
  len: number
): Promise<string> => {
  const u8salt = Uint8Array.from(atob(saltArray64), (c) => c.charCodeAt(0));

  return pbkdf2(password, u8salt, 'SHA-256', iterations, len).then((hashed) => {
    const base64 = window.btoa(String.fromCharCode.apply(null, Array.from(hashed)));
    return base64;
  });
};

// key is base64 encoded
const rsaImportKey = async (key64: string): Promise<CryptoKey> => {
  const binaryDer = base64ToUint8Array(key64);

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      //modulusLength: 256,
      hash: { name: 'SHA-256' },
    },
    false,
    ['encrypt'] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );
};

const rsaOaepEncrypt = async (publicKey: CryptoKey, bytes: Uint8Array) => {
  return crypto.subtle
    .encrypt(
      {
        name: 'RSA-OAEP',
        //label: Uint8Array([...]) //optional
      },
      publicKey, //from generateKey or importKey above
      bytes //stringToUint8Array(str) //ArrayBuffer of data you want to encrypt
    )
    .then((encrypted) => {
      return new Uint8Array(encrypted);
    });
};
