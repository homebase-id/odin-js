import { expect, test } from 'vitest';
import { cbcDecrypt } from '../../helpers/AesEncrypt';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { bip39Decode, bip39Encode } from '../../helpers/Bip39';
import {
  getPhraseCheck,
  getResetKey,
  getSecondPasswordKey,
  guidToDotNetBytes,
  makePhraseCopies,
  makeZkDriveKeys,
  makeZkKeys,
  openPassword,
  openZkMasterKey,
  recoverWithPhrase,
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
  recoveryPhrase: 'none' as const,
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

test('a password change keeps the master key and re-locks the password copy', async () => {
  const first = await makeZkKeys(PASSWORD);
  const relocked = await makeZkKeys('new password', first.masterKey);
  const opened = await openZkMasterKey(
    'new password',
    status(relocked.request.zkSaltKek64, relocked.request.zkKekEncryptedZkMasterKey)
  );
  expect(opened).toEqual(first.masterKey);
  expect(await openPassword(relocked.request.zkMasterKeyEncryptedPassword, opened)).toBe('new password');
});

// The standard BIP39 vectors odin-core's BIP39 tests check (TestMnemonicsAndSeedEnglish), plus one
// made with Python's hashlib from the same word list.
const BIP39_VECTORS: [Uint8Array, string][] = [
  [new Uint8Array(16), 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'],
  [new Uint8Array(16).fill(0x7f), 'legal winner thank year wave sausage worth useful legal winner thank yellow'],
  [new Uint8Array(16).fill(0xff), 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'],
  [Uint8Array.from({ length: 16 }, (_, i) => i), 'abandon amount liar amount expire adjust cage candy arch gather drum buyer'],
];

test('BIP39 encodes and decodes the shared vectors', async () => {
  for (const [entropy, phrase] of BIP39_VECTORS) {
    expect(await bip39Encode(entropy)).toBe(phrase);
    expect(await bip39Decode(phrase)).toEqual(entropy);
  }
});

test('BIP39 forgives case and spacing but not a wrong word or checksum', async () => {
  const [entropy, phrase] = BIP39_VECTORS[3];
  expect(await bip39Decode(`  ${phrase.toUpperCase().replace(/ /g, '   ')} `)).toEqual(entropy);
  await expect(bip39Decode(phrase.replace('buyer', 'notaword'))).rejects.toThrow('not a recovery phrase word');
  await expect(bip39Decode(phrase.replace('buyer', 'zoo'))).rejects.toThrow('does not check out');
  await expect(bip39Decode('abandon about')).rejects.toThrow('12 words');
});

test('the reset key is the one odin-core derives (RecoveryPhraseTests)', async () => {
  // Python: hkdf-sha256(ikm=bytes(range(16)), salt=b'', info=b'homebase-recovery-reset-key', 16)
  expect(uint8ArrayToBase64(await getResetKey(BIP39_VECTORS[3][0]))).toBe('UObib1b+8ABBLhC7sBHNOw==');
});

test('the phrase check value is the one odin-core computes (RecoveryPhraseTests)', async () => {
  // Python: base64(sha256(b'homebase-recovery-phrase-check' + bytes(range(16))))
  expect(await getPhraseCheck(BIP39_VECTORS[3][0])).toBe('Eo89wt2+AtmPabdl1v7jP8jYb9oHQlRxCiqqpMave6Y=');
});

test('the phrase copies give back the password, and show the phrase again', async () => {
  const keys = await makeZkKeys(PASSWORD);
  const phrase = BIP39_VECTORS[3][1];
  const copies = await makePhraseCopies(phrase, keys.masterKey);

  const recovered = await recoverWithPhrase(phrase, {
    phraseKeyEncryptedZkMasterKey: copies.phraseKeyEncryptedZkMasterKey,
    zkMasterKeyEncryptedPassword: keys.request.zkMasterKeyEncryptedPassword,
  });
  expect(recovered.password).toBe(PASSWORD);
  expect(recovered.zkMasterKey).toEqual(keys.masterKey);
  expect(copies.resetKey64).toBe(uint8ArrayToBase64(await getResetKey(keys.masterKey)));
  expect(await bip39Encode(await zkOpen(copies.zkMasterKeyEncryptedPhraseKey, keys.masterKey))).toBe(phrase);
  expect(copies.phraseCheck64).toBe(await getPhraseCheck(BIP39_VECTORS[3][0]));
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
