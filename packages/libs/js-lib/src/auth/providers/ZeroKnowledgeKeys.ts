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
// Keys are 16 bytes, like today's master key and drive keys. odin-core's test helper ZkBrowser does
// the same maths, and both sides check one shared vector.

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

/** The second password key: the same pbkdf2 as the KEK, with its own salt. */
export const getSecondPasswordKey = (password: string, salt64: string) =>
  pbkdf2HmacSha256(password, base64ToUint8Array(salt64));

export interface ZkKeysRequest {
  zkSaltKek64: string;
  zkKekEncryptedZkMasterKey: string;
  zkMasterKeyEncryptedPassword: string;
}

/** Where the owner's recovery phrase is (odin-core `RecoveryPhraseState`). */
export type RecoveryPhraseState = 'none' | 'onServer' | 'takenOver' | 'needsReentry';

export interface ZkStatus {
  zkSaltKek64?: string | null;
  zkKekEncryptedZkMasterKey?: string | null;
  /** The password, locked by the zero-knowledge master key; null until a login writes it. */
  zkMasterKeyEncryptedPassword?: string | null;
  recoveryPhrase: RecoveryPhraseState;
}

export const lockPassword = async (password: string, zkMasterKey: Uint8Array) =>
  zkLock(stringToUint8Array(password), zkMasterKey);

export const openPassword = async (locked64: string, zkMasterKey: Uint8Array) =>
  byteArrayToString(await zkOpen(locked64, zkMasterKey));

/**
 * Makes the keys at the first login, or re-locks `masterKey` for a password change. A new salt
 * each time, as a password change also gets new login salts. The password copy is what recovery
 * gives back.
 */
export const makeZkKeys = async (
  password: string,
  masterKey?: Uint8Array
): Promise<{ masterKey: Uint8Array; request: ZkKeysRequest }> => {
  const salt64 = uint8ArrayToBase64(getRandom16ByteArray());
  const key = masterKey ?? getRandom16ByteArray();

  return {
    masterKey: key,
    request: {
      zkSaltKek64: salt64,
      zkKekEncryptedZkMasterKey: await zkLock(key, await getSecondPasswordKey(password, salt64)),
      zkMasterKeyEncryptedPassword: await lockPassword(password, key),
    },
  };
};

export interface ZkPhraseCopiesRequest {
  phraseKeyEncryptedZkMasterKey: string;
  zkMasterKeyEncryptedPhraseKey: string;
  phraseCheck64: string;
  resetKey64: string;
}

export interface ZkPhraseRecovery {
  phraseKeyEncryptedZkMasterKey: string;
  zkMasterKeyEncryptedPassword: string;
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
 * The reset key: hkdf-sha256 of the zero-knowledge master key, no salt, 16 bytes, as odin-core's
 * test helper ZkBrowser.ResetKey. One way: it can't be turned back into the master key. The server
 * locks today's master key with it at the takeover, so recovery with the phrase can always reset
 * the password.
 */
export const getResetKey = async (zkMasterKey: Uint8Array): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey('raw', zkMasterKey, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: RESET_KEY_INFO },
    key,
    KEY_LENGTH * 8
  );
  return new Uint8Array(bits);
};

/**
 * The two copies the browser makes of the recovery phrase: the zero-knowledge master key locked by
 * it, and the phrase locked by the zero-knowledge master key, to show it again. With the check
 * value, so the server refuses copies made with any other phrase, and the reset key. Both copies
 * are opened again before they go: the server can't check them, so the browser does.
 */
export const makePhraseCopies = async (
  phrase: string,
  zkMasterKey: Uint8Array
): Promise<ZkPhraseCopiesRequest> => {
  const phraseKey = await bip39Decode(phrase);
  const copies = {
    phraseKeyEncryptedZkMasterKey: await zkLock(zkMasterKey, phraseKey),
    zkMasterKeyEncryptedPhraseKey: await zkLock(phraseKey, zkMasterKey),
    phraseCheck64: await getPhraseCheck(phraseKey),
    resetKey64: uint8ArrayToBase64(await getResetKey(zkMasterKey)),
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
 * Recovery with the phrase: the zero-knowledge master key, then the password. The master key comes
 * back too, for a reset when the password no longer logs in.
 */
export interface PhraseRecovery {
  zkMasterKey: Uint8Array;
  password: string;
}

export const recoverWithPhrase = async (phrase: string, recovery: ZkPhraseRecovery): Promise<PhraseRecovery> => {
  const zkMasterKey = await zkOpen(recovery.phraseKeyEncryptedZkMasterKey, await bip39Decode(phrase));
  return { zkMasterKey, password: await openPassword(recovery.zkMasterKeyEncryptedPassword, zkMasterKey) };
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
