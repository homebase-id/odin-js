import { cbcEncrypt, gcmDecrypt, gcmEncrypt } from '../../helpers/AesEncrypt';
import {
  base64ToUint8Array,
  byteArrayToString,
  getRandom16ByteArray,
  isAGuidId,
  mergeByteArrays,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import { bip39Decode } from '../../helpers/Bip39';
import { sha256 } from '../../helpers/HashUtil';
import { createEccPair, exportEccPublicKey } from './EccKeyProvider';

// The owner's zero-knowledge keys (odin-core docs/zero-knowledge-keys-plan.md) and recovery in the
// browser (docs/zero-knowledge-recovery-plan.md). Every key here is made and opened in the browser;
// the identity server only stores the locked copies.
//
// A locked value is base64 of a 12-byte IV followed by the AES-GCM ciphertext and its 16-byte tag.
// Keys are 16 bytes, like today's master key and drive keys. A sealed value is base64 of a throwaway
// P-384 public key (97 bytes, uncompressed) and a value locked by
// hkdf-sha256(ECDH(throwaway, recipient), "homebase-zk-seal"): anyone with the public key seals,
// only the private key opens. odin-core's test helper ZkBrowser does the same maths, and both sides
// check shared vectors.

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 16;
const IV_LENGTH = 12;

/** pbkdf2 with HMAC-SHA256, as the owner login works out the password hash and the KEK. */
export const pbkdf2HmacSha256 = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToUint8Array(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    passwordKey,
    KEY_LENGTH * 8
  );

  return new Uint8Array(bits);
};

export const zkLock = async (data: Uint8Array, key: Uint8Array): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  return uint8ArrayToBase64(mergeByteArrays([iv, await gcmEncrypt(data, iv, key)]));
};

export const zkOpen = async (locked64: string, key: Uint8Array): Promise<Uint8Array> => {
  const bytes = base64ToUint8Array(locked64);
  return gcmDecrypt(bytes.slice(IV_LENGTH), bytes.slice(0, IV_LENGTH), key);
};

const ECDH_P384 = { name: 'ECDH', namedCurve: 'P-384' };
const SEAL_PUBLIC_KEY_LENGTH = 97;
const SEAL_INFO = stringToUint8Array('homebase-zk-seal');

/** hkdf-sha256, no salt, 16 bytes: the reset key and the seal key. */
const hkdf16 = async (ikm: Uint8Array, info: Uint8Array): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info },
    key,
    KEY_LENGTH * 8
  );
  return new Uint8Array(bits);
};

const sealKey = async (privateKey: CryptoKey, publicKey: CryptoKey) =>
  hkdf16(new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 384)), SEAL_INFO);

/** Seals `data` to a P-384 public key (a JWK, as `exportEccPublicKey` makes it). */
export const zkSeal = async (data: Uint8Array, publicKeyJwk: string): Promise<string> => {
  const recipient = await crypto.subtle.importKey('jwk', JSON.parse(publicKeyJwk), ECDH_P384, false, []);
  const throwaway = await createEccPair();
  const throwawayPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', throwaway.publicKey));
  const locked = await zkLock(data, await sealKey(throwaway.privateKey, recipient));
  return uint8ArrayToBase64(mergeByteArrays([throwawayPublicKey, base64ToUint8Array(locked)]));
};

/** Opens a sealed value with the private key (PKCS8). */
export const zkUnseal = async (sealed64: string, privateKeyPkcs8: Uint8Array): Promise<Uint8Array> => {
  const bytes = base64ToUint8Array(sealed64);
  const me = await crypto.subtle.importKey('pkcs8', privateKeyPkcs8, ECDH_P384, false, ['deriveBits']);
  const throwaway = await crypto.subtle.importKey('raw', bytes.slice(0, SEAL_PUBLIC_KEY_LENGTH), ECDH_P384, false, []);
  return zkOpen(uint8ArrayToBase64(bytes.slice(SEAL_PUBLIC_KEY_LENGTH)), await sealKey(me, throwaway));
};

/** The second password key: the same pbkdf2 as the KEK, with its own salt. */
export const getSecondPasswordKey = (password: string, salt64: string) =>
  pbkdf2HmacSha256(password, base64ToUint8Array(salt64));

export interface ZkKeysRequest {
  zkSaltKek64: string;
  zkKekEncryptedZkMasterKey: string;
  /** The password sealed to the phrase's public key, once the phrase was taken over. */
  phrasePublicKeyEncryptedPassword?: string;
}

/** Where the owner's recovery phrase is (odin-core `RecoveryPhraseState`). */
export type RecoveryPhraseState = 'none' | 'onServer' | 'takenOver' | 'needsReentry';

export interface ZkStatus {
  zkSaltKek64?: string | null;
  zkKekEncryptedZkMasterKey?: string | null;
  recoveryPhrase: RecoveryPhraseState;
  /** The phrase's public key once taken over: the password is sealed to it. */
  phrasePublicKeyJwk?: string | null;
  /** Whether the password copy exists. The browser can't open it; only the phrase does. */
  hasPasswordCopy: boolean;
}

/** The password copy recovery with the phrase gives back: sealed, so only the phrase opens it. */
export const sealPassword = async (password: string, phrasePublicKeyJwk: string) =>
  zkSeal(stringToUint8Array(password), phrasePublicKeyJwk);

/**
 * Makes the keys at the first login, or re-locks `masterKey` for a password change. A new salt
 * each time, as a password change also gets new login salts. With the phrase's public key, the
 * password copy too.
 */
export const makeZkKeys = async (
  password: string,
  masterKey?: Uint8Array,
  phrasePublicKeyJwk?: string | null
): Promise<{ masterKey: Uint8Array; request: ZkKeysRequest }> => {
  const salt64 = uint8ArrayToBase64(getRandom16ByteArray());
  const key = masterKey ?? getRandom16ByteArray();

  return {
    masterKey: key,
    request: {
      zkSaltKek64: salt64,
      zkKekEncryptedZkMasterKey: await zkLock(key, await getSecondPasswordKey(password, salt64)),
      phrasePublicKeyEncryptedPassword: phrasePublicKeyJwk ? await sealPassword(password, phrasePublicKeyJwk) : undefined,
    },
  };
};

export interface ZkPhraseCopiesRequest {
  phraseKeyEncryptedZkMasterKey: string;
  zkMasterKeyEncryptedPhraseKey: string;
  phrasePublicKeyJwk: string;
  phraseKeyEncryptedPhrasePrivateKey: string;
  phraseCheck64: string;
  resetKey64: string;
}

export interface ZkPhraseRecovery {
  phraseKeyEncryptedZkMasterKey: string;
  phraseKeyEncryptedPhrasePrivateKey: string;
  phrasePublicKeyJwk: string;
  /** Null until a password login wrote it. */
  phrasePublicKeyEncryptedPassword?: string | null;
}

const PHRASE_CHECK_PREFIX = stringToUint8Array('homebase-recovery-phrase-check');

/**
 * A recovery phrase's check value, as odin-core's `RecoveryPhraseCheck` computes it: SHA-256 of a
 * prefix and the phrase's 16 bytes. The bytes are random, so it can't be reversed.
 */
export const getPhraseCheck = async (phraseKey: Uint8Array) =>
  uint8ArrayToBase64(await sha256(mergeByteArrays([PHRASE_CHECK_PREFIX, phraseKey])));

const RESET_KEY_INFO = stringToUint8Array('homebase-recovery-reset-key');

/**
 * The reset key: hkdf-sha256 of the recovery phrase's 16 bytes, no salt, 16 bytes, as odin-core's
 * test helper ZkBrowser.ResetKey. One way: it can't be turned back into the phrase. The server locks
 * today's master key with it, so recovery with the phrase can always reset the password. From the
 * phrase, not the zero-knowledge master key: someone who once had the password has that key.
 */
export const getResetKey = (phraseKey: Uint8Array): Promise<Uint8Array> => hkdf16(phraseKey, RESET_KEY_INFO);

/**
 * What the browser makes from the recovery phrase: the zero-knowledge master key locked by it, the
 * phrase locked by the zero-knowledge master key (to show it again), and a new key pair whose
 * private half the phrase locks (the password is sealed to its public half). With the check value,
 * so the server refuses copies made with any other phrase, and the reset key. The two copies are
 * opened again before they go: the server can't check them, so the browser does.
 */
export const makePhraseCopies = async (
  phrase: string,
  zkMasterKey: Uint8Array
): Promise<ZkPhraseCopiesRequest> => {
  const phraseKey = await bip39Decode(phrase);
  const pair = await createEccPair();
  const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const copies = {
    phraseKeyEncryptedZkMasterKey: await zkLock(zkMasterKey, phraseKey),
    zkMasterKeyEncryptedPhraseKey: await zkLock(phraseKey, zkMasterKey),
    phrasePublicKeyJwk: await exportEccPublicKey(pair.publicKey),
    phraseKeyEncryptedPhrasePrivateKey: await zkLock(privateKey, phraseKey),
    phraseCheck64: await getPhraseCheck(phraseKey),
    resetKey64: uint8ArrayToBase64(await getResetKey(phraseKey)),
  };

  const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
  if (
    !sameBytes(await zkOpen(copies.phraseKeyEncryptedZkMasterKey, phraseKey), zkMasterKey) ||
    !sameBytes(await zkOpen(copies.zkMasterKeyEncryptedPhraseKey, zkMasterKey), phraseKey)
  ) {
    throw new Error('The recovery phrase copies do not open');
  }

  return copies;
};

/**
 * Recovery with the phrase: the password, and what a reset needs when it no longer logs in (the
 * zero-knowledge master key, the reset key, the public key to seal the new password to).
 */
export interface PhraseRecovery {
  /** Undefined when there is no copy, or it doesn't open (someone sealed junk): reset instead. */
  password?: string;
  zkMasterKey: Uint8Array;
  resetKey: Uint8Array;
  phrasePublicKeyJwk: string;
}

/** Throws when the phrase isn't the owner's: it opens nothing. */
export const recoverWithPhrase = async (phrase: string, recovery: ZkPhraseRecovery): Promise<PhraseRecovery> => {
  const phraseKey = await bip39Decode(phrase);
  const zkMasterKey = await zkOpen(recovery.phraseKeyEncryptedZkMasterKey, phraseKey);
  const privateKey = await zkOpen(recovery.phraseKeyEncryptedPhrasePrivateKey, phraseKey);

  let password: string | undefined;
  if (recovery.phrasePublicKeyEncryptedPassword) {
    try {
      password = byteArrayToString(await zkUnseal(recovery.phrasePublicKeyEncryptedPassword, privateKey));
    } catch {
      // junk: reset instead
    }
  }

  return {
    password,
    zkMasterKey,
    resetKey: await getResetKey(phraseKey),
    phrasePublicKeyJwk: recovery.phrasePublicKeyJwk,
  };
};

export const openZkMasterKey = async (password: string, status: ZkStatus): Promise<Uint8Array> => {
  if (!status.zkSaltKek64 || !status.zkKekEncryptedZkMasterKey) {
    throw new Error('No zero-knowledge keys to open');
  }

  return zkOpen(status.zkKekEncryptedZkMasterKey, await getSecondPasswordKey(password, status.zkSaltKek64));
};

/** A GUID's bytes in .NET's `Guid.ToByteArray()` order, as the server encrypts a drive id. */
export const guidToDotNetBytes = (guid: string): Uint8Array => {
  if (!isAGuidId(guid)) throw new Error(`Not a GUID: ${guid}`);
  const hex = guid.replace(/-/g, '');

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);

  // The first three groups are little-endian
  return new Uint8Array([
    bytes[3], bytes[2], bytes[1], bytes[0],
    bytes[5], bytes[4],
    bytes[7], bytes[6],
    ...bytes.slice(8),
  ]);
};

export interface ZkConvertDriveRequest {
  zkMasterKeyEncryptedStorageKey: string;
  encryptedIdIv64: string;
  encryptedIdValue64: string;
  writeOnlyPublicKeyJwk: string;
  zkStorageKeyEncryptedWriteOnlyPrivateKey: string;
}

/**
 * A new drive key and write-only key pair for converting a drive. The server gets the drive key
 * locked by the zero-knowledge master key, the drive id encrypted with it, the public key as a JWK,
 * and the private key (PKCS8) locked by the drive key.
 */
export const makeZkDriveKeys = async (
  driveId: string,
  zkMasterKey: Uint8Array
): Promise<{ driveKey: Uint8Array; request: ZkConvertDriveRequest }> => {
  const driveKey = getRandom16ByteArray();
  const idIv = getRandom16ByteArray();
  const encryptedId = await cbcEncrypt(guidToDotNetBytes(driveId), idIv, driveKey);

  const pair = await createEccPair();
  const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));

  return {
    driveKey,
    request: {
      zkMasterKeyEncryptedStorageKey: await zkLock(driveKey, zkMasterKey),
      encryptedIdIv64: uint8ArrayToBase64(idIv),
      encryptedIdValue64: uint8ArrayToBase64(encryptedId),
      writeOnlyPublicKeyJwk: await exportEccPublicKey(pair.publicKey),
      zkStorageKeyEncryptedWriteOnlyPrivateKey: await zkLock(privateKey, driveKey),
    },
  };
};
