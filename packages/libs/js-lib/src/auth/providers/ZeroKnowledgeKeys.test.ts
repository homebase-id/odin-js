import { expect, test } from 'vitest';
import { cbcDecrypt } from '../../helpers/AesEncrypt';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import {
  getSecondPasswordKey,
  guidToDotNetBytes,
  makeZkDriveKeys,
  makeZkKeys,
  openZkMasterKey,
  zkLock,
  zkOpen,
} from './ZeroKnowledgeKeys';

// The vector odin-core checks too (ZeroKnowledgeKeysTests.TheSharedVectorOpens), made with Python's
// hashlib and cryptography. It pins the browser's formats to the server's test helper.
const PASSWORD = 'EnSøienØ';
const SALT64 = 'AAECAwQFBgcICQoLDA0ODw==';
const SECOND_PASSWORD_KEY64 = '+pL3zwkIcDcDpYKkLbVc4A==';
const MASTER_KEY64 = 'EBESExQVFhcYGRobHB0eHw==';
const LOCKED_MASTER_KEY = 'ICEiIyQlJicoKSorjWGICGzIuJPS3SPnEBWvlaM3EZ0jd9msGp8vJrhDYXA=';

const status = (salt: string, locked: string) => ({
  zkSaltKek64: salt,
  zkKekEncryptedZkMasterKey: locked,
});

test('the second password key is pbkdf2 like the KEK, UTF-8 password included', async () => {
  expect(uint8ArrayToBase64(await getSecondPasswordKey(PASSWORD, SALT64))).toBe(SECOND_PASSWORD_KEY64);
});

test('the shared vector opens', async () => {
  const masterKey = await openZkMasterKey(PASSWORD, status(SALT64, LOCKED_MASTER_KEY));
  expect(uint8ArrayToBase64(masterKey)).toBe(MASTER_KEY64);
});

test('the wrong password does not open the master key', async () => {
  await expect(openZkMasterKey('wrong', status(SALT64, LOCKED_MASTER_KEY))).rejects.toThrow();
});

test('lock and open round trip, with a fresh IV each time', async () => {
  const key = base64ToUint8Array(MASTER_KEY64);
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const a = await zkLock(data, key);
  const b = await zkLock(data, key);
  expect(a).not.toBe(b);
  expect(Array.from(await zkOpen(a, key))).toEqual([1, 2, 3, 4, 5]);
});

test('a password change keeps the master key', async () => {
  const loginKeys = { hpwd64: 'aHB3ZA==', kek64: 'a2Vr' };
  const first = await makeZkKeys(PASSWORD, loginKeys);
  const relocked = await makeZkKeys('new password', loginKeys, first.masterKey);
  const opened = await openZkMasterKey(
    'new password',
    status(relocked.request.zkSaltKek64, relocked.request.zkKekEncryptedZkMasterKey)
  );
  expect(opened).toEqual(first.masterKey);
});

test('guids are in .NET Guid.ToByteArray order', () => {
  // Python's uuid bytes_le, which is what .NET writes
  expect(uint8ArrayToBase64(guidToDotNetBytes('46242d0d67604b2aa683f05cd48d4aef'))).toBe(
    uint8ArrayToBase64(
      new Uint8Array([0x0d, 0x2d, 0x24, 0x46, 0x60, 0x67, 0x2a, 0x4b, 0xa6, 0x83, 0xf0, 0x5c, 0xd4, 0x8d, 0x4a, 0xef])
    )
  );
});

test('drive keys: the id decrypts with the drive key, the private key with the drive key', async () => {
  const masterKey = base64ToUint8Array(MASTER_KEY64);
  const driveId = '46242d0d67604b2aa683f05cd48d4aef';
  const { driveKey, request } = await makeZkDriveKeys(driveId, masterKey);

  expect(await zkOpen(request.zkMasterKeyEncryptedStorageKey, masterKey)).toEqual(driveKey);
  const id = await cbcDecrypt(
    base64ToUint8Array(request.encryptedIdValue64),
    base64ToUint8Array(request.encryptedIdIv64),
    driveKey
  );
  expect(id).toEqual(guidToDotNetBytes(driveId));
  expect((await zkOpen(request.zkStorageKeyEncryptedWriteOnlyPrivateKey, driveKey)).length).toBeGreaterThan(0);
  expect(JSON.parse(request.writeOnlyPublicKeyJwk).crv).toBe('P-384');
});
