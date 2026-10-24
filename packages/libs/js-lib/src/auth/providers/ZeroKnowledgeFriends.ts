import { cbcDecrypt, cbcEncrypt } from '../../helpers/AesEncrypt';
import {
  base64ToUint8Array,
  byteArrayToString,
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  mergeByteArrays,
  stringGuidsEqual,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import { rebuildSecret, splitSecret } from '../../helpers/ShamirSecretSharing';
import { EncryptedKeyHeader, KeyHeader } from '../../core/DriveData/File/DriveFileTypes';
import { createEccPair, exportEccPublicKey } from './EccKeyProvider';
import { PasswordRecovery, hkdf16, zkLock, zkOpen, zkSeal, zkUnseal } from './ZeroKnowledgeKeys';

// Recovery with friends in the browser (odin-core docs/zero-knowledge-recovery-plan.md, "Building the
// friends pair"). The browser deals as odin-core's CreateShards does for the automated deal, and
// seals each gated friend's shard to them as a deposit; the friend's browser opens it and seals it
// again to the recovering browser's throwaway key; that browser rebuilds the secret. The server sees
// none of the secret.

/// Deposits

/**
 * A deposit's key header: the file's key header (IV and AES key) sealed to a drive's write-only
 * public key. The identity server stores and returns it as is; it is not shared-secret encrypted.
 */
export interface SealedKeyHeader {
  encryptionVersion: 1;
  type: 'sealed';
  /** base64: the file's IV, also inside the seal */
  iv: string;
  /** base64: the sealed IV and AES key */
  encryptedAesKey: string;
}

/** Whether a file's key header (as a query or a read returns it) is a deposit's. */
export const isSealedKeyHeader = (keyHeader: EncryptedKeyHeader | SealedKeyHeader | undefined | null) =>
  !!keyHeader && (keyHeader.type === 'sealed' || keyHeader.type === 12);

export const sealKeyHeader = async (keyHeader: KeyHeader, publicKeyJwk: string): Promise<SealedKeyHeader> => ({
  encryptionVersion: 1,
  type: 'sealed',
  iv: uint8ArrayToBase64(keyHeader.iv),
  encryptedAesKey: await zkSeal(mergeByteArrays([keyHeader.iv, keyHeader.aesKey]), publicKeyJwk),
});

const asBase64 = (value: string | Uint8Array) => (typeof value === 'string' ? value : uint8ArrayToBase64(value));

/** Opens a deposit's key header with the drive's write-only private key (PKCS8). */
export const openSealedKeyHeader = async (
  keyHeader: EncryptedKeyHeader | SealedKeyHeader,
  writeOnlyPrivateKeyPkcs8: Uint8Array
): Promise<KeyHeader> => {
  if (!isSealedKeyHeader(keyHeader)) throw new Error('Not a sealed key header');
  const bytes = await zkUnseal(asBase64(keyHeader.encryptedAesKey), writeOnlyPrivateKeyPkcs8);
  return { iv: bytes.slice(0, 16), aesKey: bytes.slice(16) };
};

/** A zero-knowledge drive's keys, as owner drive info returns them. */
export interface ZkDriveKeys {
  zkMasterKeyEncryptedStorageKey?: string | null;
  zkStorageKeyEncryptedWriteOnlyPrivateKey?: string | null;
}

/** The drive's write-only private key: the zero-knowledge master key opens the drive key, which opens it. */
export const openWriteOnlyPrivateKey = async (drive: ZkDriveKeys, zkMasterKey: Uint8Array) => {
  if (!drive.zkMasterKeyEncryptedStorageKey || !drive.zkStorageKeyEncryptedWriteOnlyPrivateKey) {
    throw new Error('The drive is not zero knowledge');
  }
  const driveKey = await zkOpen(drive.zkMasterKeyEncryptedStorageKey, zkMasterKey);
  return zkOpen(drive.zkStorageKeyEncryptedWriteOnlyPrivateKey, driveKey);
};

/// Dealing

export type FriendType = 'automatic' | 'delegate';

export interface FriendToDealTo {
  odinId: string;
  type: FriendType;
  /** A gated friend's Shard Recovery write-only public key (JWK), which their shard is sealed to. */
  publicKeyJwk?: string;
}

export interface DealtShard {
  player: { odinId: string; type: FriendType };
  shardId: string;
  index: number;
  encryptionKey: string;
  encryptionIv: string;
  dealerEncryptedShard?: string;
  depositContent?: string;
  depositKeyHeader?: SealedKeyHeader;
}

export interface ZkShamirCopiesRequest {
  shamirPublicKeyJwk: string;
  shamirKeyEncryptedShamirPrivateKey: string;
  shamirKeyEncryptedZkMasterKey: string;
  resetKey64: string;
}

/** The body of `security/recovery/configure-shards`. */
export interface ConfigureShardsRequest {
  minMatchingShards: number;
  shards: DealtShard[];
  shamirCopies: ZkShamirCopiesRequest;
}

/** What a gated friend's deposit holds: today's PlayerEncryptedShard, less what the server keeps plain. */
export interface GatedShardContent {
  id: string;
  index: number;
  player: { odinId: string; type: FriendType };
  /** base64 of the piece locked by the shard's key */
  dealerEncryptedShard: string;
}

const SECRET_LENGTH = 16;
const SHAMIR_RESET_KEY_INFO = stringToUint8Array('homebase-shamir-reset-key');

/** The friends' reset key: hkdf-sha256 of the secret the shards rebuild, no salt, 16 bytes. */
export const getShamirResetKey = (secret: Uint8Array) => hkdf16(secret, SHAMIR_RESET_KEY_INFO);

/**
 * Deals to `friends`: a new secret, split into one piece per friend, each locked by its own shard
 * key (kept in the dealer package); a gated friend's shard sealed to them as a deposit. The secret
 * locks the zero-knowledge master key and a new key pair's private half; the password is sealed to
 * the public half at the next password login.
 */
export const dealToFriends = async (
  friends: FriendToDealTo[],
  minMatchingShards: number,
  zkMasterKey: Uint8Array
): Promise<ConfigureShardsRequest> => {
  const automatic = friends.filter((f) => f.type === 'automatic').length;
  if (automatic >= minMatchingShards) {
    throw new Error('Automatic friends alone must not reach the minimum: at least one friend must approve');
  }

  const secret = getRandom16ByteArray();
  const pieces = splitSecret(friends.length, minMatchingShards, secret);

  const shards = await Promise.all(
    friends.map(async (friend, i): Promise<DealtShard> => {
      const piece = pieces[i];
      const encryptionKey = getRandom16ByteArray();
      const encryptionIv = getRandom16ByteArray();
      const dealerEncryptedShard = uint8ArrayToBase64(await cbcEncrypt(piece.shard, encryptionIv, encryptionKey));
      const player = { odinId: friend.odinId, type: friend.type };
      const shardId = getNewId();
      const shard: DealtShard = {
        player,
        shardId,
        index: piece.index,
        encryptionKey: uint8ArrayToBase64(encryptionKey),
        encryptionIv: uint8ArrayToBase64(encryptionIv),
      };

      if (friend.type === 'automatic') return { ...shard, dealerEncryptedShard };

      if (!friend.publicKeyJwk) throw new Error(`No public key to seal ${friend.odinId}'s shard to`);
      const content: GatedShardContent = { id: shardId, index: piece.index, player, dealerEncryptedShard };
      const fileKey: KeyHeader = { iv: getRandom16ByteArray(), aesKey: getRandom16ByteArray() };
      return {
        ...shard,
        depositContent: uint8ArrayToBase64(
          await cbcEncrypt(stringToUint8Array(jsonStringify64(content)), fileKey.iv, fileKey.aesKey)
        ),
        depositKeyHeader: await sealKeyHeader(fileKey, friend.publicKeyJwk),
      };
    })
  );

  const pair = await createEccPair();
  const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));

  return {
    minMatchingShards,
    shards,
    shamirCopies: {
      shamirPublicKeyJwk: await exportEccPublicKey(pair.publicKey),
      shamirKeyEncryptedShamirPrivateKey: await zkLock(privateKey, secret),
      shamirKeyEncryptedZkMasterKey: await zkLock(zkMasterKey, secret),
      resetKey64: uint8ArrayToBase64(await getShamirResetKey(secret)),
    },
  };
};

/// Releasing (the friend's browser)

/**
 * Opens a gated friend's shard (a deposit on their Shard Recovery drive) and seals its piece again
 * to the recovering browser's throwaway key. The piece stays locked by the dealer's shard key, so
 * the friend learns nothing.
 */
export const releaseGatedShard = async (
  deposit: { content: string; keyHeader: EncryptedKeyHeader | SealedKeyHeader },
  writeOnlyPrivateKeyPkcs8: Uint8Array,
  recoveryPublicKeyJwk: string
): Promise<{ index: number; sealedShard: string }> => {
  const fileKey = await openSealedKeyHeader(deposit.keyHeader, writeOnlyPrivateKeyPkcs8);
  const json = byteArrayToString(await cbcDecrypt(base64ToUint8Array(deposit.content), fileKey.iv, fileKey.aesKey));
  const content = JSON.parse(json) as GatedShardContent;

  return {
    index: content.index,
    sealedShard: await zkSeal(base64ToUint8Array(content.dealerEncryptedShard), recoveryPublicKeyJwk),
  };
};

/// Recovering

export interface ShamirRecoveryBundle {
  minMatchingShards: number;
  envelopes: {
    player: { odinId: string; type: FriendType };
    encryptionKey: string;
    encryptionIv: string;
    shardId: string;
    index: number;
  }[];
  shards: {
    id: string;
    index: number;
    player: { odinId: string; type: FriendType };
    dealerEncryptedShard: string;
  }[];
  copies: {
    shamirPublicKeyJwk: string;
    shamirKeyEncryptedShamirPrivateKey: string;
    shamirKeyEncryptedZkMasterKey: string;
    shamirPublicKeyEncryptedPassword?: string | null;
  };
}

/**
 * Recovery with friends: opens the bundle sealed to this browser's throwaway key, rebuilds the
 * secret from the collected shards and the dealer's shard keys, and opens the password and the
 * zero-knowledge master key. Throws when the shards don't rebuild the secret.
 */
export const recoverWithFriends = async (
  sealedBundle64: string,
  throwawayPrivateKeyPkcs8: Uint8Array
): Promise<PasswordRecovery> => {
  const bundle = JSON.parse(
    byteArrayToString(await zkUnseal(sealedBundle64, throwawayPrivateKeyPkcs8))
  ) as ShamirRecoveryBundle;

  const pieces = await Promise.all(
    bundle.shards.map(async (shard) => {
      const envelope = bundle.envelopes.find((e) => stringGuidsEqual(e.shardId, shard.id));
      if (!envelope) throw new Error(`No shard key for shard ${shard.id}`);

      // A gated friend's browser sealed their piece to this browser
      const locked =
        shard.player.type === 'delegate'
          ? await zkUnseal(shard.dealerEncryptedShard, throwawayPrivateKeyPkcs8)
          : base64ToUint8Array(shard.dealerEncryptedShard);
      const piece = await cbcDecrypt(
        locked,
        base64ToUint8Array(envelope.encryptionIv),
        base64ToUint8Array(envelope.encryptionKey)
      );
      return { index: shard.index, shard: piece };
    })
  );

  const secret = rebuildSecret(pieces, SECRET_LENGTH);
  const { copies } = bundle;
  const privateKey = await zkOpen(copies.shamirKeyEncryptedShamirPrivateKey, secret);
  const zkMasterKey = await zkOpen(copies.shamirKeyEncryptedZkMasterKey, secret);

  let password: string | undefined;
  if (copies.shamirPublicKeyEncryptedPassword) {
    try {
      password = byteArrayToString(await zkUnseal(copies.shamirPublicKeyEncryptedPassword, privateKey));
    } catch {
      // junk: reset instead
    }
  }

  return {
    password,
    zkMasterKey,
    resetKey: await getShamirResetKey(secret),
    shamirPublicKeyJwk: copies.shamirPublicKeyJwk,
  };
};
