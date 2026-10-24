import { cbcEncrypt, gcmDecrypt, gcmEncrypt } from '../../helpers/AesEncrypt';
import {
  base64ToUint8Array,
  getRandom16ByteArray,
  isAGuidId,
  mergeByteArrays,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import { createEccPair, exportEccPublicKey } from './EccKeyProvider';

// The owner's zero-knowledge keys (odin-core docs/zero-knowledge-keys-plan.md). Every key here is
// made and opened in the browser; the identity server only stores the locked copies.
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

/** The login keys as the owner login sends them; recovery logs in with these (plan B). */
export interface LoginKeys {
  hpwd64: string;
  kek64: string;
}

export interface ZkKeysRequest {
  zkSaltKek64: string;
  zkKekEncryptedZkMasterKey: string;
  zkMasterKeyEncryptedLoginKeys: string;
}

export interface ZkStatus {
  zkSaltKek64?: string | null;
  zkKekEncryptedZkMasterKey?: string | null;
}

/**
 * Makes the keys at the first login, or re-locks `masterKey` for a password change. A new salt
 * each time, as a password change also gets new login salts.
 */
export const makeZkKeys = async (
  password: string,
  loginKeys: LoginKeys,
  masterKey?: Uint8Array
): Promise<{ masterKey: Uint8Array; request: ZkKeysRequest }> => {
  const salt64 = uint8ArrayToBase64(getRandom16ByteArray());
  const key = masterKey ?? getRandom16ByteArray();
  const loginKeysJson = JSON.stringify({ hpwd64: loginKeys.hpwd64, kek64: loginKeys.kek64 });

  return {
    masterKey: key,
    request: {
      zkSaltKek64: salt64,
      zkKekEncryptedZkMasterKey: await zkLock(key, await getSecondPasswordKey(password, salt64)),
      zkMasterKeyEncryptedLoginKeys: await zkLock(stringToUint8Array(loginKeysJson), key),
    },
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
