import { expect, test } from 'vitest';
import { base64ToUint8Array, getRandom16ByteArray, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { rebuildSecret, splitSecret } from '../../helpers/ShamirSecretSharing';
import { isSealedKeyHeader } from '../../core/DriveData/SecurityHelpers';
import {
  ShamirRecoveryBundle,
  dealToFriends,
  getShamirResetKey,
  openSealedKeyHeader,
  recoverWithFriends,
  releaseGatedShard,
  sealKeyHeader,
} from './ZeroKnowledgeFriends';
import { createExportedEccPair, readSealKeyId, sealKeyId, sealPassword, zkSeal } from './ZeroKnowledgeKeys';

const shard = (index: number, shard64: string) => ({ index, shard: base64ToUint8Array(shard64) });

// odin-core's ShamirSecretSharing.cs split this secret (bytes i * 7 + 1); any three rebuild it.
const CSHARP_SECRET = 'AQgPFh0kKzI5QEdOVVxjag==';
const CSHARP_SHARDS = [
  shard(1, 'TBPvFYd3nXATIxRnAFvDf2B40losCnHhkVu+CQ11+I8='),
  shard(2, 'ARHRt9ARqzb5BgBOE6fMyqsjGhx8l+36aAHIeIFUWPit'),
  shard(3, 'rqSfRUtp2Qon0LjVhPD0flw9gITS1wjbm50wV6pu2Yk='),
  shard(4, 'xSFgX4fkdzQpW0jdCSph/fiRa2tqvVkmTcMr649OJV4='),
  shard(5, 'AVVH+x7HGxF3Cp/+KjR5Eyn4Fd0wX6DrSBg6az0C9tws'),
];

test('any three of the shards odin-core split rebuild its secret', () => {
  for (const three of [[0, 1, 2], [1, 2, 3], [0, 2, 4], [2, 3, 4]]) {
    expect(uint8ArrayToBase64(rebuildSecret(three.map((i) => CSHARP_SHARDS[i]), 16))).toBe(CSHARP_SECRET);
  }
  expect(uint8ArrayToBase64(rebuildSecret(CSHARP_SHARDS, 16))).toBe(CSHARP_SECRET);
  expect(uint8ArrayToBase64(rebuildSecret(CSHARP_SHARDS.slice(0, 2), 16))).not.toBe(CSHARP_SECRET);
});

test('a split rebuilds, a leading zero byte included', () => {
  const secret = getRandom16ByteArray();
  secret[0] = 0;
  const shards = splitSecret(5, 3, secret);
  expect(shards.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
  expect(rebuildSecret([shards[4], shards[0], shards[2]], 16)).toEqual(secret);
});

const makePair = async () => {
  const pair = await createExportedEccPair();
  return { publicKeyJwk: pair.publicKeyJwk, privateKey: pair.privateKeyPkcs8 };
};

test('a deposit key header is sealed to the drive and opens with its write-only key', async () => {
  const drive = await makePair();
  const keyHeader = { iv: getRandom16ByteArray(), aesKey: getRandom16ByteArray() };
  const sealed = await sealKeyHeader(keyHeader, drive.publicKeyJwk);

  expect(isSealedKeyHeader(sealed)).toBe(true);
  expect(isSealedKeyHeader({ ...sealed, type: 12 } as never)).toBe(true);
  expect(isSealedKeyHeader({ ...sealed, type: 11 } as never)).toBe(false);
  expect(readSealKeyId(sealed.encryptedAesKey)).toBe(await sealKeyId(drive.publicKeyJwk));
  expect(await openSealedKeyHeader(sealed, drive.privateKey)).toEqual(keyHeader);
  await expect(openSealedKeyHeader(sealed, (await makePair()).privateKey)).rejects.toThrow();
});

test('the friends reset key is hkdf of the secret with its own label', async () => {
  // Python: hkdf-sha256(ikm=bytes(range(16)), salt=b'', info=b'homebase-shamir-reset-key', 16)
  const secret = Uint8Array.from({ length: 16 }, (_, i) => i);
  expect(uint8ArrayToBase64(await getShamirResetKey(secret))).toBe('AgfFEly7RprtGEQcjgk2SQ==');
});

test('a deal can not let the automatic friends reach the minimum alone', async () => {
  const friends = [
    { odinId: 'a.dotyou.cloud', type: 'automatic' as const },
    { odinId: 'b.dotyou.cloud', type: 'automatic' as const },
    { odinId: 'c.dotyou.cloud', type: 'delegate' as const, publicKeyJwk: (await makePair()).publicKeyJwk },
  ];
  await expect(dealToFriends(friends, 2, getRandom16ByteArray())).rejects.toThrow('at least one friend must approve');
});

/**
 * The whole flow in the browser: deal to two gated friends and an automatic one, the gated friends
 * release to the recovering browser, the server's bundle (built here as odin-core builds it) gives
 * back the password and the zero-knowledge master key.
 */
test('a deal is recovered with one gated friend and the automatic friend', async () => {
  const zkMasterKey = getRandom16ByteArray();
  const ann = await makePair();
  const bob = await makePair();
  const deal = await dealToFriends(
    [
      { odinId: 'ann.dotyou.cloud', type: 'delegate', publicKeyJwk: ann.publicKeyJwk },
      { odinId: 'bob.dotyou.cloud', type: 'delegate', publicKeyJwk: bob.publicKeyJwk },
      { odinId: 'cat.dotyou.cloud', type: 'automatic' },
    ],
    2,
    zkMasterKey
  );

  expect(deal.shards.map((s) => s.index)).toEqual([1, 2, 3]);
  const [annShard, , catShard] = deal.shards;
  expect(catShard.dealerEncryptedShard).toBeTruthy();
  expect(catShard.depositKeyHeader).toBeUndefined();
  expect(annShard.dealerEncryptedShard).toBeUndefined();
  expect(readSealKeyId(annShard.depositKeyHeader!.encryptedAesKey)).toBe(await sealKeyId(ann.publicKeyJwk));

  // The password copy a password login writes after the deal
  const password = 'correct horse battery staple';
  const passwordCopy = await sealPassword(password, deal.shamirCopies.shamirPublicKeyJwk);

  // Ann approves: her browser opens her deposit and seals the piece to the recovering browser
  const recovering = await makePair();
  const released = await releaseGatedShard(
    { content: annShard.depositContent!, keyHeader: annShard.depositKeyHeader! },
    ann.privateKey,
    recovering.publicKeyJwk
  );
  expect(released.index).toBe(annShard.index);
  await expect(
    releaseGatedShard({ content: annShard.depositContent!, keyHeader: annShard.depositKeyHeader! }, bob.privateKey, recovering.publicKeyJwk)
  ).rejects.toThrow();

  const bundle: ShamirRecoveryBundle = {
    minMatchingShards: deal.minMatchingShards,
    envelopes: deal.shards.map((s) => ({
      player: s.player,
      encryptionKey: s.encryptionKey,
      encryptionIv: s.encryptionIv,
      shardId: s.shardId.toUpperCase(),
      index: s.index,
    })),
    shards: [
      { id: annShard.shardId, index: released.index, player: annShard.player, dealerEncryptedShard: released.sealedShard },
      { id: catShard.shardId, index: catShard.index, player: catShard.player, dealerEncryptedShard: catShard.dealerEncryptedShard! },
    ],
    copies: { ...deal.shamirCopies, shamirPublicKeyEncryptedPassword: passwordCopy },
  };
  const sealedBundle = await zkSeal(new TextEncoder().encode(JSON.stringify(bundle)), recovering.publicKeyJwk);

  const recovered = await recoverWithFriends(sealedBundle, recovering.privateKey);
  expect(recovered.password).toBe(password);
  expect(recovered.zkMasterKey).toEqual(zkMasterKey);
  expect(recovered.shamirPublicKeyJwk).toBe(deal.shamirCopies.shamirPublicKeyJwk);
  expect(uint8ArrayToBase64(recovered.resetKey)).toBe(deal.shamirCopies.resetKey64);

  // The secret the shards rebuild opens the master key copy; junk as the password copy means a reset
  const junk = await recoverWithFriends(
    await zkSeal(
      new TextEncoder().encode(
        JSON.stringify({ ...bundle, copies: { ...bundle.copies, shamirPublicKeyEncryptedPassword: await sealPassword('x', ann.publicKeyJwk) } })
      ),
      recovering.publicKeyJwk
    ),
    recovering.privateKey
  );
  expect(junk.password).toBeUndefined();
  expect(junk.zkMasterKey).toEqual(zkMasterKey);

  // A wrong piece rebuilds a secret that opens nothing
  const wrong = { ...bundle.shards[0], index: 4 };
  const wrongBundle = await zkSeal(
    new TextEncoder().encode(JSON.stringify({ ...bundle, shards: [wrong, bundle.shards[1]] })),
    recovering.publicKeyJwk
  );
  await expect(recoverWithFriends(wrongBundle, recovering.privateKey)).rejects.toThrow();
});
