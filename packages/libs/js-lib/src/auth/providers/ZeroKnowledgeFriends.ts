import { cbcDecrypt, cbcEncrypt } from '../../helpers/AesEncrypt';
import {
  decryptUsingKeyHeader,
  encryptWithKeyheader,
  isSealedKeyHeader,
} from '../../core/DriveData/SecurityHelpers';
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
import { ShamirShard, rebuildSecret, splitSecret } from '../../helpers/ShamirSecretSharing';
import { EncryptedKeyHeader, KeyHeader } from '../../core/DriveData/File/DriveFileTypes';
import {
  PasswordRecovery,
  createExportedEccPair,
  hkdf16,
  zkLock,
  zkOpen,
  zkSeal,
  zkUnseal,
} from './ZeroKnowledgeKeys';

// Recovery in the browser (odin-core docs/zero-knowledge-recovery-plan.md, "Building the friends
// pair" and "Building the automated deal"). The browser deals, to friends or to the host's automated
// identities, as odin-core's CreateShards did on the server, and seals each gated friend's shard to
// them as a deposit. Every holder's shard comes back sealed to the recovering browser's throwaway
// key: a gated friend's browser seals it when they approve, an automatic holder when the owner clicks
// the link it emailed. That browser rebuilds the secret. The server sees none of the secret.

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

export interface FriendPlayer {
  odinId: string;
  type: FriendType;
}

export interface FriendToDealTo {
  odinId: string;
  type: FriendType;
  /** A gated friend's Shard Recovery write-only public key (JWK), which their shard is sealed to. */
  publicKeyJwk?: string;
}

export interface DealtShard {
  player: FriendPlayer;
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
  player: FriendPlayer;
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
 * the public half at the next password login. `automated`: the automated deal, to the host's
 * automated identities, whose automatic shards reach the threshold by design (the owner's inbox
 * then recovers the account).
 */
export const dealToFriends = async (
  friends: FriendToDealTo[],
  minMatchingShards: number,
  zkMasterKey: Uint8Array,
  options?: { automated?: boolean }
): Promise<ConfigureShardsRequest> => {
  const automatic = friends.filter((f) => f.type === 'automatic').length;
  if (!options?.automated && automatic >= minMatchingShards) {
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
      const player: FriendPlayer = { odinId: friend.odinId, type: friend.type };
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
          await encryptWithKeyheader(stringToUint8Array(jsonStringify64(content)), fileKey)
        ),
        depositKeyHeader: await sealKeyHeader(fileKey, friend.publicKeyJwk),
      };
    })
  );

  const pair = await createExportedEccPair();

  return {
    minMatchingShards,
    shards,
    shamirCopies: {
      shamirPublicKeyJwk: pair.publicKeyJwk,
      shamirKeyEncryptedShamirPrivateKey: await zkLock(pair.privateKeyPkcs8, secret),
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
  const json = byteArrayToString(await decryptUsingKeyHeader(base64ToUint8Array(deposit.content), fileKey));
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
    player: FriendPlayer;
    encryptionKey: string;
    encryptionIv: string;
    shardId: string;
    index: number;
  }[];
  /** The collected shards, each piece sealed to this browser by its holder */
  shards: GatedShardContent[];
  /**
   * Null for a deal the server made, before the browser dealt every deal: its secret opens only
   * today's master key, so this browser sends it with a new password (`finalize`).
   */
  copies?: (Omit<ZkShamirCopiesRequest, 'resetKey64'> & { shamirPublicKeyEncryptedPassword?: string | null }) | null;
}

/**
 * What the bundle gives back: the password (a deal made in the browser), or, for a server-made deal,
 * the secret to send with a new password.
 */
export type BundleRecovery =
  | { serverMade: false; recovery: PasswordRecovery }
  | { serverMade: true; secret: Uint8Array };

/**
 * Recovery once enough shards are in: opens the bundle sealed to this browser's throwaway key,
 * rebuilds the secret from the collected shards and the dealer's shard keys, and opens the password
 * and the zero-knowledge master key. Throws when the shards don't rebuild the secret.
 */
export const recoverFromBundle = async (
  sealedBundle64: string,
  throwawayPrivateKeyPkcs8: Uint8Array
): Promise<BundleRecovery> => {
  const bundle = JSON.parse(
    byteArrayToString(await zkUnseal(sealedBundle64, throwawayPrivateKeyPkcs8))
  ) as ShamirRecoveryBundle;

  // A shard that doesn't open (a holder's server posted junk) is left out rather than spoiling the rest
  const opened = await Promise.allSettled(
    bundle.shards.map(async (shard) => {
      const envelope = bundle.envelopes.find((e) => stringGuidsEqual(e.shardId, shard.id));
      if (!envelope) throw new Error(`No shard key for shard ${shard.id}`);

      // Every holder sealed its piece to this browser. The dealer's own envelope says where each
      // piece sits in the split: a holder could send any index.
      const locked = await zkUnseal(shard.dealerEncryptedShard, throwawayPrivateKeyPkcs8);
      const piece = await cbcDecrypt(
        locked,
        base64ToUint8Array(envelope.encryptionIv),
        base64ToUint8Array(envelope.encryptionKey)
      );
      return { index: envelope.index, shard: piece };
    })
  );
  const pieces = opened.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  // A server-made deal. Nothing here can check its secret: the server does, when it opens the master
  // key. Too few pieces can only give a wrong one.
  if (!bundle.copies) {
    if (pieces.length < bundle.minMatchingShards) throw new Error("The shards don't rebuild the secret");
    return { serverMade: true, secret: rebuildSecret(pieces, SECRET_LENGTH) };
  }

  const { copies } = bundle;
  const { secret, zkMasterKey } = await rebuildAndOpen(pieces, bundle.minMatchingShards, copies.shamirKeyEncryptedZkMasterKey);
  const privateKey = await zkOpen(copies.shamirKeyEncryptedShamirPrivateKey, secret);

  let password: string | undefined;
  if (copies.shamirPublicKeyEncryptedPassword) {
    try {
      password = byteArrayToString(await zkUnseal(copies.shamirPublicKeyEncryptedPassword, privateKey));
    } catch {
      // junk: reset instead
    }
  }

  return {
    serverMade: false,
    recovery: {
      password,
      zkMasterKey,
      resetKey: await getShamirResetKey(secret),
      shamirPublicKeyJwk: copies.shamirPublicKeyJwk,
    },
  };
};

/** How many combinations of shards `rebuildAndOpen` tries before it gives up. */
const MAX_COMBINATIONS = 500;

/**
 * The secret from `pieces`, checked by opening the zero-knowledge master key with it (AES-GCM fails on
 * a wrong secret). All of them first; if that fails, a junk piece is among them, so each combination
 * of `minMatchingShards` pieces in turn, up to `MAX_COMBINATIONS`.
 */
const rebuildAndOpen = async (
  pieces: ShamirShard[],
  minMatchingShards: number,
  shamirKeyEncryptedZkMasterKey: string
): Promise<{ secret: Uint8Array; zkMasterKey: Uint8Array }> => {
  const tryOpen = async (subset: ShamirShard[]) => {
    try {
      const secret = rebuildSecret(subset, SECRET_LENGTH);
      return { secret, zkMasterKey: await zkOpen(shamirKeyEncryptedZkMasterKey, secret) };
    } catch {
      return undefined;
    }
  };

  const all = await tryOpen(pieces);
  if (all) return all;

  let tried = 0;
  for (const subset of combinations(pieces, minMatchingShards)) {
    if (++tried > MAX_COMBINATIONS) break;
    const opened = await tryOpen(subset);
    if (opened) return opened;
  }

  throw new Error("The shards don't rebuild the secret");
};

function* combinations<T>(items: T[], size: number, start = 0, chosen: T[] = []): Generator<T[]> {
  if (chosen.length === size) {
    yield chosen;
    return;
  }
  for (let i = start; i <= items.length - (size - chosen.length); i++) {
    yield* combinations(items, size, i + 1, [...chosen, items[i]]);
  }
}

/** One holder of the recovery, and whether its shard is in. */
export interface RecoverySlot {
  player: FriendPlayer;
  filled: boolean;
}

/**
 * The slots the recovery status seals to the browser that started: the status needs no login, so
 * the holders' names go only there.
 */
export const openRecoverySlots = async (
  sealedSlots64: string,
  throwawayPrivateKeyPkcs8: Uint8Array
): Promise<RecoverySlot[]> =>
  JSON.parse(byteArrayToString(await zkUnseal(sealedSlots64, throwawayPrivateKeyPkcs8))) as RecoverySlot[];
