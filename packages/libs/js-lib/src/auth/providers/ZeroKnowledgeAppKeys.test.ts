import { expect, test } from 'vitest';
import {
  getRandom16ByteArray,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import {
  ZkAppKeys,
  createExportedEccPair,
  makeAppKeyBackfill,
  makeConversionKeepingKey,
  openOrMakeAppKey,
  sealAppKeyToSignIn,
  zkLock,
  zkOpen,
  zkUnseal,
} from './ZeroKnowledgeKeys';

// A zero-knowledge app key (odin-core docs/zero-knowledge-drive-api-plan.md, step 3), as the owner console makes,
// backfills and seals it. odin-core's VaultConversionTests play the same steps against the server.

const VAULT = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const SHARD_RECOVERY = 'a1b2c3d4-0000-4000-8000-000000000001';

const base64Url = (text: string) =>
  uint8ArrayToBase64(stringToUint8Array(text))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const app = (overrides: Partial<ZkAppKeys> = {}): ZkAppKeys => ({
  appId: '2d781401-3804-4b57-b4aa-d8e4e2ef39f4',
  appSlug: 'chat',
  zkMasterKeyEncryptedAppKey: null,
  drives: [],
  ...overrides,
});

test('an app with no key gets a new one, locked by the zero-knowledge master key', async () => {
  const masterKey = getRandom16ByteArray();
  const { appKey, newLocked } = await openOrMakeAppKey(app(), masterKey);

  expect(newLocked).toBeDefined();
  expect(await zkOpen(newLocked as string, masterKey)).toEqual(appKey);
});

test("an app's key is opened, never replaced", async () => {
  const masterKey = getRandom16ByteArray();
  const existing = getRandom16ByteArray();
  const { appKey, newLocked } = await openOrMakeAppKey(
    app({ zkMasterKeyEncryptedAppKey: await zkLock(existing, masterKey) }),
    masterKey
  );

  expect(appKey).toEqual(existing);
  expect(newLocked).toBeUndefined();
});

test("the backfill locks each zero-knowledge drive's key the app lacks, and nothing else", async () => {
  const masterKey = getRandom16ByteArray();
  const shardKey = getRandom16ByteArray();
  const appKey = getRandom16ByteArray();
  const keys = app({
    zkMasterKeyEncryptedAppKey: await zkLock(appKey, masterKey),
    drives: [
      {
        driveId: SHARD_RECOVERY,
        isZeroKnowledge: true,
        zkMasterKeyEncryptedStorageKey: await zkLock(shardKey, masterKey),
        hasAppCopy: false,
      },
      {
        driveId: VAULT,
        isZeroKnowledge: true,
        zkMasterKeyEncryptedStorageKey: await zkLock(getRandom16ByteArray(), masterKey),
        hasAppCopy: true,
      },
      {
        driveId: 'c0ffee00-0000-4000-8000-000000000002',
        isZeroKnowledge: false,
        hasAppCopy: false,
      },
    ],
  });

  const { request, locked } = await makeAppKeyBackfill(keys, masterKey);

  expect(locked).toEqual(keys.zkMasterKeyEncryptedAppKey); // what consent names: the copy the server holds
  expect(request?.zkMasterKeyEncryptedAppKey).toBeUndefined();
  expect(Object.keys(request?.zkAppKeyEncryptedStorageKeys ?? {})).toEqual([SHARD_RECOVERY]);
  expect(await zkOpen(request!.zkAppKeyEncryptedStorageKeys[SHARD_RECOVERY], appKey)).toEqual(
    shardKey
  );
});

test("a new app key's locked copy is the one saved, and the one consent names", async () => {
  const masterKey = getRandom16ByteArray();
  const { appKey, locked, request } = await makeAppKeyBackfill(app(), masterKey);

  expect(locked).toEqual(request?.zkMasterKeyEncryptedAppKey);
  expect(await zkOpen(locked, masterKey)).toEqual(appKey);
});

test('nothing missing, nothing to save', async () => {
  const masterKey = getRandom16ByteArray();
  const keys = app({ zkMasterKeyEncryptedAppKey: await zkLock(getRandom16ByteArray(), masterKey) });

  expect((await makeAppKeyBackfill(keys, masterKey)).request).toBeUndefined();
});

test("the app key sealed to a sign-in's base64url JWK opens only with that sign-in's private key", async () => {
  const signIn = await createExportedEccPair();
  const appKey = getRandom16ByteArray();

  const sealed = await sealAppKeyToSignIn(appKey, base64Url(signIn.publicKeyJwk));

  expect(await zkUnseal(sealed, signIn.privateKeyPkcs8)).toEqual(appKey);
  await expect(zkUnseal(sealed, (await createExportedEccPair()).privateKeyPkcs8)).rejects.toThrow();
});

test('converting Vault keeps its key and locks a copy for each app granted it, and only those', async () => {
  const masterKey = getRandom16ByteArray();
  const driveKey = getRandom16ByteArray();
  const existingAppKey = getRandom16ByteArray();
  const granted = app({
    zkMasterKeyEncryptedAppKey: await zkLock(existingAppKey, masterKey),
    drives: [
      {
        driveId: VAULT,
        isZeroKnowledge: false,
        hasAppCopy: false,
      },
    ],
  });
  const newApp = app({
    appId: '6d38d41a-99f5-4f45-a591-9862d83e1fc8',
    appSlug: 'vault',
    drives: [
      {
        driveId: VAULT.toUpperCase(),
        isZeroKnowledge: false,
        hasAppCopy: false,
      },
    ],
  });
  const other = app({ appId: '11111111-1111-4111-8111-111111111111', appSlug: 'other' });

  const request = await makeConversionKeepingKey(VAULT, driveKey, masterKey, [
    granted,
    newApp,
    other,
  ]);

  expect(await zkOpen(request.zkMasterKeyEncryptedStorageKey, masterKey)).toEqual(driveKey);
  await zkOpen(request.zkStorageKeyEncryptedWriteOnlyPrivateKey, driveKey); // the drive key opens the new private half
  expect(request.apps.map((a) => a.appId)).toEqual([granted.appId, newApp.appId]);

  const [first, second] = request.apps;
  expect(first.zkMasterKeyEncryptedAppKey).toBeUndefined();
  expect(await zkOpen(first.zkAppKeyEncryptedStorageKeys[VAULT], existingAppKey)).toEqual(driveKey);
  const madeAppKey = await zkOpen(second.zkMasterKeyEncryptedAppKey as string, masterKey);
  expect(await zkOpen(second.zkAppKeyEncryptedStorageKeys[VAULT], madeAppKey)).toEqual(driveKey);
});
