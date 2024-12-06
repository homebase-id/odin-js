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
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import { PublicKeyData } from './AuthenticationProvider';

export interface NonceData {
  crc: number;
  id: string;
  nonce64: string;
  publicJwk: string;
  saltKek64: string;
  saltPassword64: string;
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
  const hostEccPublicKey = await importRemotePublicEccKey(hostBase64PublicJWK);

  const clientEccKey = await createEccPair();
  const clientprivateKey = clientEccKey.privateKey;

  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(clientprivateKey, hostEccPublicKey, nonceData.nonce64)
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

export const encryptRecoveryKey = async (
  recoveryKey: string,
  nonceData: AuthenticationReplyNonce,
  publicKey: PublicKeyData
) => {
  const hostEccPublicKey = await importRemotePublicEccKey(publicKey.publicKeyJwkBase64Url);

  const clientEccKey = await createEccPair();
  const clientprivateKey = clientEccKey.privateKey;

  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(clientprivateKey, hostEccPublicKey, nonceData.nonce64)
  );
  const encrytpedGcm = await aesGcmEncryptWithEccSharedSecret(
    exchangedSecret,
    base64ToUint8Array(nonceData.nonce64),
    stringToUint8Array(recoveryKey)
  );

  return {
    remotePublicKeyJwk: await exportEccPublicKey(clientEccKey.publicKey),
    salt: nonceData.nonce64,
    iv: nonceData.nonce64,
    encryptionPublicKeyCrc32: publicKey.crC32c,
    encryptedData: uint8ArrayToBase64(encrytpedGcm),
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
