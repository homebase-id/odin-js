import { expect, test } from 'vitest';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { sealKeyId, readSealKeyId } from '../../auth/providers/ZeroKnowledgeKeys';
import {
  isClientLocked,
  isClientLockedKeyHeader,
  isDeposit,
  openClientLockedKeyHeader,
} from './SecurityHelpers';

// Fixed values for the two client-locked key headers (odin-core docs/zero-knowledge-drive-api-plan.md,
// step 2). The same values are in odin-core (tests/apps/Odin.Hosting.Tests.V2/ZeroKnowledge/
// ClientLockedKeyHeaderVectorTests.cs); change both or neither. odin-core made the sealed one, with a
// throwaway key, so it is checked by opening it.
const driveKey = 'AAECAwQFBgcICQoLDA0ODw==';
const iv = 'EBESExQVFhcYGRobHB0eHw==';
const aesKey = 'ICEiIyQlJicoKSorLC0uLw==';
const zkDriveEncryptedAesKey = 'xqE7N4ePW4JvT4FiocjYeQeFPxlO+hclYcV072RPhmMJbAd9FxFTFUuXv4ql/85L';
const writeOnlyPrivateKeyPkcs8 =
  'MIG2AgEAMBAGByqGSM49AgEGBSuBBAAiBIGeMIGbAgEBBDCZAel29rv0BgBwa7LGp4+tmSi5g4LlRzkW9/ZLQNgeVdrB44imUOGeaKmn1eiPZsShZANiAATKPHfd0ojszgjchR06XVN2p/iaosbJedgQGD86jcH39CM7EjWiXa6wVTW3cWGdDXwWQYx4NHDg8lIWULARJhvn02W1/eoTtDkhdpQrY6KmVbxpY/ehNZlDlhlh3MntF40=';
const writeOnlyPublicKeyJwk =
  '{"kty":"EC","crv":"P-384","x":"yjx33dKI7M4I3IUdOl1Tdqf4mqLGyXnYEBg_Oo3B9_QjOxI1ol2usFU1t3FhnQ18","y":"FkGMeDRw4PJSFlCwESYb59Nltf3qE7Q5IXaUK2OiplW8aWP3oTWZQ5YZYdzJ7ReN"}';
const sealedEncryptedAesKey =
  'ARRSmXQEgEhVDqJf8V4wR/vfRnjuBiMDCgpqQ0EvwP8Sbhg/htjK6DPN0tPu9kf4VKIvY0JpI7ekZehCr+RJr6buacGObBkW+4KXwPFn4aNzze/w+3mTcGuj+8oKsvICcbFc5rPogLwn6Oz/OQuWmSn3xtY70ljeN7b6eV3wkBqmS0sKbr1o/iBvA+hgSlg/4KiDGsTq2pxlrCRLPvr2Vxjk';

const opened = (keyHeader: { iv: Uint8Array; aesKey: Uint8Array }) => ({
  iv: uint8ArrayToBase64(keyHeader.iv),
  aesKey: uint8ArrayToBase64(keyHeader.aesKey),
});

test('a zkDrive key header opens with the drive key', async () => {
  const keyHeader = {
    encryptionVersion: 1,
    type: 'zkDrive',
    iv,
    encryptedAesKey: zkDriveEncryptedAesKey,
  };
  expect(
    opened(await openClientLockedKeyHeader(keyHeader, { driveKey: base64ToUint8Array(driveKey) }))
  ).toEqual({ iv, aesKey });
  await expect(openClientLockedKeyHeader(keyHeader, {})).rejects.toThrow();
});

test("a sealed key header opens with the drive's write-only private key", async () => {
  const keyHeader = {
    encryptionVersion: 1,
    type: 'sealed',
    iv,
    encryptedAesKey: sealedEncryptedAesKey,
  };
  expect(readSealKeyId(sealedEncryptedAesKey)).toBe(await sealKeyId(writeOnlyPublicKeyJwk));
  const keys = { writeOnlyPrivateKey: base64ToUint8Array(writeOnlyPrivateKeyPkcs8) };
  expect(opened(await openClientLockedKeyHeader(keyHeader, keys))).toEqual({ iv, aesKey });
  await expect(
    openClientLockedKeyHeader(keyHeader, { driveKey: base64ToUint8Array(driveKey) })
  ).rejects.toThrow();
});

test('client-locked: sealed and zkDrive, by name or number; aes is not', () => {
  for (const type of ['sealed', 12, 'zkDrive', 13])
    expect(isClientLockedKeyHeader({ type })).toBe(true);
  for (const type of ['aes', 11]) expect(isClientLockedKeyHeader({ type })).toBe(false);

  const file = (type: string, isEncrypted = true) => ({
    fileMetadata: { isEncrypted },
    sharedSecretEncryptedKeyHeader: { type },
  });
  expect([isClientLocked(file('zkDrive')), isDeposit(file('zkDrive'))]).toEqual([true, false]);
  expect([isClientLocked(file('sealed')), isDeposit(file('sealed'))]).toEqual([true, true]);
  expect(isClientLocked(file('sealed', false))).toBe(false);
});

test('an aes key header is not opened here', async () => {
  await expect(
    openClientLockedKeyHeader({ type: 'aes', iv, encryptedAesKey: zkDriveEncryptedAesKey }, {})
  ).rejects.toThrow();
});
