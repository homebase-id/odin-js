import { DotYouClient, getDrivesByType, getKnownOdinErrorMessages } from '@homebase-id/js-lib/core';
import {
  bip39Decode,
  bip39Encode,
  base64ToUint8Array,
  stringGuidsEqual,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import {
  PasswordRecovery,
  ZkConvertDriveRequest,
  ZkKeysRequest,
  ZkPhraseCopiesRequest,
  ZkPhraseRecovery,
  ConfigureShardsRequest,
  FriendToDealTo,
  ZkStatus,
  dealToFriends,
  getPhraseCheck,
  makePhraseCopies,
  makeZkDriveKeys,
  makeZkKeys,
  openZkMasterKey,
  recoverWithPhrase,
  sealPassword,
  zkLock,
  zkOpen,
} from '@homebase-id/js-lib/auth';
import { OWNER_ZK_MASTER_KEY, t } from '@homebase-id/common-app';
import { SHARD_RECOVERY_DRIVE } from '../app/wellKnownDrives';
import type { ShamirDealPlan } from './ShamirProvider';
import {
  encryptRecoveryKey,
  getPublicKey,
  getSalts,
  prepareAuthPassword,
  preparePasswordProof,
} from './AuthenticationHelper';

// The owner's zero-knowledge keys (odin-core docs/zero-knowledge-keys-plan.md) and recovery in the
// browser (docs/zero-knowledge-recovery-plan.md). The browser makes and opens every key; the
// identity server only stores the locked copies. The password is needed only at login and at a
// password change.

/** Whether the deal must be dealt again, which a password login does (`ZkStatus.dealNeedsDealing`). */
export const getDealNeedsDealing = async (dotYouClient: DotYouClient) =>
  !!(await getZkStatus(dotYouClient)).dealNeedsDealing;

const getZkStatus = async (dotYouClient: DotYouClient): Promise<ZkStatus> =>
  dotYouClient
    .createAxiosClient()
    .get<ZkStatus>('/security/zk')
    .then((response) => response.data);

const saveZkKeys = async (dotYouClient: DotYouClient, request: ZkKeysRequest) =>
  dotYouClient.createAxiosClient().post('/security/zk/keys', request);

// These want the password itself, not just the session, so the login proves it again. Each copy is
// written only when it's missing: it's sealed, so this browser can't check it.
const saveMissingPasswordCopies = async (dotYouClient: DotYouClient, password: string, status: ZkStatus) => {
  const phrasePublicKeyJwk = !status.hasPasswordCopy ? status.phrasePublicKeyJwk : undefined;
  const shamirPublicKeyJwk = !status.hasShamirPasswordCopy ? status.shamirPublicKeyJwk : undefined;
  if (!phrasePublicKeyJwk && !shamirPublicKeyJwk) return;

  const [phrasePublicKeyEncryptedPassword, shamirPublicKeyEncryptedPassword, currentAuthenticationPasswordReply] =
    await Promise.all([
      phrasePublicKeyJwk ? sealPassword(password, phrasePublicKeyJwk) : undefined,
      shamirPublicKeyJwk ? sealPassword(password, shamirPublicKeyJwk) : undefined,
      preparePasswordProof(dotYouClient, password),
    ]);
  return dotYouClient.createAxiosClient().post('/security/zk/password', {
    phrasePublicKeyEncryptedPassword,
    shamirPublicKeyEncryptedPassword,
    currentAuthenticationPasswordReply,
  });
};

const handOverPhrase = async (dotYouClient: DotYouClient, password: string) =>
  dotYouClient
    .createAxiosClient()
    .post<{ phrase: string }>('/security/zk/phrase-handover', {
      currentAuthenticationPasswordReply: await preparePasswordProof(dotYouClient, password),
    })
    .then((response) => response.data.phrase);

// The takeover's proof is made while the handover runs: the login has 10 seconds for all of this.
const takeOverPhrase = async (dotYouClient: DotYouClient, password: string, masterKey: Uint8Array) => {
  const [phrase, currentAuthenticationPasswordReply] = await Promise.all([
    handOverPhrase(dotYouClient, password),
    preparePasswordProof(dotYouClient, password),
  ]);
  const copies: ZkPhraseCopiesRequest = await makePhraseCopies(phrase, masterKey);

  return dotYouClient.createAxiosClient().post('/security/zk/phrase-takeover', {
    ...copies,
    phrasePublicKeyEncryptedPassword: await sealPassword(password, copies.phrasePublicKeyJwk),
    currentAuthenticationPasswordReply,
  });
};

const getSessionKey = async (dotYouClient: DotYouClient) =>
  dotYouClient
    .createAxiosClient()
    .get<{ sessionKey64: string }>('/security/zk/session-key')
    .then((response) => base64ToUint8Array(response.data.sessionKey64));

const convertShardRecoveryDrive = async (
  dotYouClient: DotYouClient,
  request: ZkConvertDriveRequest
) => dotYouClient.createAxiosClient().post('/security/zk/convert-shard-recovery-drive', request);

// Set when first run couldn't deal the automated deal (no zero-knowledge master key in the session
// yet, say): the next password login deals it, if there is still no deal by then.
const AUTOMATED_DEAL_PENDING = 'automated-recovery-pending';

export const rememberAutomatedDealPending = () => {
  try {
    window.localStorage.setItem(AUTOMATED_DEAL_PENDING, 'true');
  } catch {
    // nothing to remember it in: the security page offers it
  }
};

const isAutomatedDealPending = () => {
  try {
    return window.localStorage.getItem(AUTOMATED_DEAL_PENDING) === 'true';
  } catch {
    return false;
  }
};

const forgetAutomatedDealPending = () => {
  try {
    window.localStorage.removeItem(AUTOMATED_DEAL_PENDING);
  } catch {
    // nothing stored
  }
};

// Not getShamirConfiguration: that reads a failure as "no deal", which would deal over one
const getDeal = (dotYouClient: DotYouClient) =>
  dotYouClient
    .createAxiosClient()
    .get<{ minMatchingShards: number; envelopes: { player: ShamirDealPlan['players'][number] }[]; usesAutomaticRecovery: boolean } | ''>(
      '/security/recovery/config'
    )
    .then((response) => response.data || null);

/** A gated friend's Shard Recovery write-only public key; their shard is sealed to it. */
const getGatedFriendPublicKey = async (dotYouClient: DotYouClient, odinId: string) => {
  const key = await dotYouClient
    .createAxiosClient()
    .get<{ publicKeyJwk: string; isZeroKnowledge: boolean }>(
      `${dotYouClient.getRoot()}/api/v2/peer/${encodeURIComponent(odinId)}/apps/recovery/drives/shard-recovery/public-key`
    )
    .then((response) => response.data);

  // Until they log in once more, their server holds the private key and could release the shard itself
  if (!key.isZeroKnowledge) {
    throw new Error(t(`${odinId} has to log in to Homebase once more before they can hold a shard that needs their approval`));
  }
  return key.publicKeyJwk;
};

/**
 * Deals the shards to friends in this browser: the secret they rebuild never reaches the server
 * (odin-core docs/zero-knowledge-recovery-plan.md, "Building the friends pair"). Throws with a
 * message to show.
 */
export const dealToHolders = async (dotYouClient: DotYouClient, plan: ShamirDealPlan, zkMasterKey: Uint8Array) => {
  const friends: FriendToDealTo[] = await Promise.all(
    plan.players.map(async (p) => {
      const type: string = p.type;
      if (type === 'delegate') {
        return { odinId: p.odinId, type: 'delegate', publicKeyJwk: await getGatedFriendPublicKey(dotYouClient, p.odinId) };
      }
      if (type === 'automatic') return { odinId: p.odinId, type: 'automatic' };
      throw new Error(t('Only friends who approve or release automatically can hold a shard'));
    })
  );
  const request = await dealToFriends(friends, plan.minMatchingShards, zkMasterKey);
  await postDeal(dotYouClient, request, t('Failed to distribute the shards'));
};

/**
 * Deals the deal there is again, to the same holders with the same threshold: after a recovery email
 * change every holder refuses it (it hashed the old address), and a server-made automated deal gives
 * nothing back. First run's automated deal when there is none yet and first run couldn't deal it.
 */
const dealAgain = async (dotYouClient: DotYouClient, masterKey: Uint8Array, automatedPending: boolean) => {
  const deal = await getDeal(dotYouClient);
  if (!deal) return automatedPending && (await dealAutomatedRecovery(dotYouClient, masterKey));
  if (deal.usesAutomaticRecovery) return await dealAutomatedRecovery(dotYouClient, masterKey);

  await dealToHolders(
    dotYouClient,
    { players: deal.envelopes.map((e) => e.player), minMatchingShards: deal.minMatchingShards },
    masterKey
  );
  return true;
};

/** Sends a deal this browser made; throws with a message to show. */
export const postDeal = (dotYouClient: DotYouClient, request: ConfigureShardsRequest, failure: string) =>
  dotYouClient
    .createAxiosClient()
    .post('/security/recovery/configure-shards', request)
    .catch((error) => {
      console.warn(error);
      throw new Error(getKnownOdinErrorMessages(error) ?? failure);
    });

/**
 * The automated deal, dealt in this browser as a friend deal is, to this host's automated identities
 * (odin-core docs/zero-knowledge-recovery-plan.md, "Building the automated deal"): it gives back the
 * password, and each holder emails the owner a link before it releases its shard. The password copy
 * is written at a password login. False when this host has no automated recovery; throws with a
 * message to show.
 */
export const dealAutomatedRecovery = async (dotYouClient: DotYouClient, masterKey: Uint8Array) => {
  const automated = await dotYouClient
    .createAxiosClient()
    .get<ShamirDealPlan>('/security/recovery/automated-recovery-players', {
      validateStatus: (s) => s === 200 || s === 404,
    })
    .then((response) => (response.status === 200 ? response.data : null));
  if (!automated) return false;

  const request = await dealToFriends(
    automated.players.map((p) => ({ odinId: p.odinId, type: 'automatic' as const })),
    automated.minMatchingShards,
    masterKey,
    { automated: true }
  );
  await postDeal(dotYouClient, request, 'Failed to set up automatic recovery');
  return true;
};

/** This identity's Shard Recovery drive, with its zero-knowledge keys (owner only). */
export const getShardRecoveryDrive = async (dotYouClient: DotYouClient) =>
  (await getDrivesByType(dotYouClient, SHARD_RECOVERY_DRIVE.type, 1, 10)).results.find((drive) =>
    stringGuidsEqual(drive.targetDriveInfo.alias, SHARD_RECOVERY_DRIVE.alias)
  );

const getShardRecoveryDriveKey = async (dotYouClient: DotYouClient) =>
  (await getShardRecoveryDrive(dotYouClient))?.zkMasterKeyEncryptedStorageKey;

// Converted, and with a key the current master key opens. After a reset with the recovery key the
// master key is new, so the drive is converted again.
const shardRecoveryDriveOpens = async (lockedKey: string | null | undefined, masterKey: Uint8Array) => {
  if (!lockedKey) return false;

  try {
    await zkOpen(lockedKey, masterKey);
    return true;
  } catch {
    return false;
  }
};

// The session key comes only from the server, to a request carrying the owner's cookie, and stays
// in memory; localStorage holds the master key locked by it. Either half alone opens nothing.
let sessionKey: Promise<Uint8Array> | undefined;

const getSessionKeyOnce = (dotYouClient: DotYouClient) => {
  sessionKey ??= getSessionKey(dotYouClient).catch((error) => {
    sessionKey = undefined;
    throw error;
  });
  return sessionKey;
};

const rememberZkMasterKey = async (dotYouClient: DotYouClient, masterKey: Uint8Array) => {
  const locked = await zkLock(masterKey, await getSessionKeyOnce(dotYouClient));
  window.localStorage.setItem(OWNER_ZK_MASTER_KEY, locked);
};

/**
 * The zero-knowledge master key for this owner session, with no password. Undefined when this
 * session has none (it began before this shipped, or the login could not open the keys): the next
 * login stores it.
 */
export const getZkMasterKey = async (dotYouClient: DotYouClient): Promise<Uint8Array | undefined> => {
  const locked = window.localStorage.getItem(OWNER_ZK_MASTER_KEY);
  if (!locked) return undefined;

  try {
    return await zkOpen(locked, await getSessionKeyOnce(dotYouClient));
  } catch {
    return undefined;
  }
};

/**
 * Runs after every owner login, while the browser still has the password: makes the keys the first
 * time, writes the password copies (the phrase's, the friends') when they are missing, converts the
 * Shard Recovery drive when it needs it, deals the automated deal again when the server made it (or
 * a reset forgot its copies), and takes the recovery phrase over. Nobody sees any of it. Each step is
 * safe to cut off; the next login picks up where this one stopped.
 */
export const ensureZeroKnowledgeKeys = async (dotYouClient: DotYouClient, password: string) => {
  // The reads don't depend on each other: one round trip instead of three.
  const [status, shardRecoveryDriveKey] = await Promise.all([
    getZkStatus(dotYouClient),
    getShardRecoveryDriveKey(dotYouClient),
    getSessionKeyOnce(dotYouClient),
  ]);

  let masterKey: Uint8Array;
  if (!status.zkSaltKek64) {
    const keys = await makeZkKeys(password);
    await saveZkKeys(dotYouClient, keys.request);
    masterKey = keys.masterKey;
  } else {
    masterKey = await openZkMasterKey(password, status);
    // A password change writes the new ones with the keys; a friend deal or a phrase re-entry
    // leaves its copy for this login to write.
    await saveMissingPasswordCopies(dotYouClient, password, status);
  }

  await rememberZkMasterKey(dotYouClient, masterKey);

  if (!(await shardRecoveryDriveOpens(shardRecoveryDriveKey, masterKey))) {
    const { request } = await makeZkDriveKeys(SHARD_RECOVERY_DRIVE.alias, masterKey);
    await convertShardRecoveryDrive(dotYouClient, request);
  }

  // Before the takeover: a deal dealt here no longer locks the phrase, so the takeover needn't move
  // it. Its own failure stops nothing: the takeover moves an old deal itself, and the next login
  // deals again.
  try {
    const pending = isAutomatedDealPending();
    if ((status.dealNeedsDealing || pending) && (await dealAgain(dotYouClient, masterKey, pending))) {
      // The deal leaves its password copy to write, and this login has the password
      await saveMissingPasswordCopies(dotYouClient, password, await getZkStatus(dotYouClient));
    }
    if (pending) forgetAutomatedDealPending();
  } catch (error) {
    console.warn('The recovery could not be dealt again; the next login tries again', error);
  }

  if (status.recoveryPhrase === 'onServer') {
    await takeOverPhrase(dotYouClient, password, masterKey);
  }
};

/**
 * For a password change: the keys re-locked with the new password, with the new password sealed
 * to the phrase's and the friends' keys. Undefined while the browser has not made them yet; the next
 * login does.
 */
export const relockZkKeysForNewPassword = async (
  dotYouClient: DotYouClient,
  oldPassword: string,
  newPassword: string
): Promise<ZkKeysRequest | undefined> => {
  const status = await getZkStatus(dotYouClient);
  if (!status.zkSaltKek64) return undefined;

  const masterKey = await openZkMasterKey(oldPassword, status);
  return (await makeZkKeys(newPassword, masterKey, status.phrasePublicKeyJwk, status.shamirPublicKeyJwk)).request;
};

/** Where the recovery phrase is, for the security screens. */
export const getRecoveryPhraseState = async (dotYouClient: DotYouClient) =>
  (await getZkStatus(dotYouClient)).recoveryPhrase;

export const requireZkMasterKey = async (dotYouClient: DotYouClient, toDo: string) => {
  const masterKey = await getZkMasterKey(dotYouClient);
  if (!masterKey) throw new Error(`Log in again with your password to ${toDo}`);
  return masterKey;
};

/** The phrase from its copy locked by the zero-knowledge master key, as the reveal returns it. */
export const openRevealedPhrase = async (dotYouClient: DotYouClient, zkMasterKeyEncryptedPhraseKey: string) =>
  bip39Encode(
    await zkOpen(zkMasterKeyEncryptedPhraseKey, await requireZkMasterKey(dotYouClient, 'show the recovery phrase'))
  );

/** The check value of a typed phrase, for the health check once the phrase was taken over. */
export const getTypedPhraseCheck = async (phrase: string) => getPhraseCheck(await bip39Decode(phrase));

/**
 * After a reset forgot the phrase copies: lock the new zero-knowledge master key with the typed
 * phrase. The password copy follows at the next password login: there is no password here.
 */
export const reenterRecoveryPhrase = async (dotYouClient: DotYouClient, phrase: string) => {
  const masterKey = await requireZkMasterKey(dotYouClient, 'keep your recovery phrase');
  await dotYouClient.createAxiosClient().post('/security/zk/phrase-reentry', await makePhraseCopies(phrase, masterKey));
};

/**
 * Recovery with the phrase, with no login: the password, opened in this browser only, and what a
 * reset needs if there is none or it no longer logs in. 'notTakenOver' when the server still holds
 * the phrase (the page uses the old reset); 'needsReentry' when another recovery reset the password
 * and forgot the phrase's copies, so it can't recover until the owner logs in and types it again.
 */
export const recoverFromPhrase = async (
  dotYouClient: DotYouClient,
  phrase: string
): Promise<PasswordRecovery | 'notTakenOver' | 'needsReentry'> => {
  const response = await dotYouClient
    .createAxiosClient()
    .get<ZkPhraseRecovery>('/authentication/zk-phrase-recovery', {
      validateStatus: (s) => s === 200 || s === 404 || s === 409,
    });
  if (response.status === 404) return 'notTakenOver';
  if (response.status === 409) return 'needsReentry';

  return recoverWithPhrase(phrase, response.data);
};

/**
 * When there is no recovered password, or it doesn't log in (someone with the password sealed
 * junk): the reset key (the phrase's or the friends') sets a new one, and the recovered
 * zero-knowledge master key is locked by it. The reset key goes encrypted to the host's key, as the
 * old reset sends the phrase. The other recovery's password copy is written at the next login.
 */
export const resetPasswordWithResetKey = async (
  dotYouClient: DotYouClient,
  recovery: PasswordRecovery,
  newPassword: string
): Promise<boolean> => {
  const [passwordReply, zkKeys, publicKey] = await Promise.all([
    getSalts(dotYouClient).then((salts) => prepareAuthPassword(newPassword, salts)),
    makeZkKeys(newPassword, recovery.zkMasterKey, recovery.phrasePublicKeyJwk, recovery.shamirPublicKeyJwk).then(
      (keys) => keys.request
    ),
    getPublicKey(dotYouClient),
  ]);
  const encryptedResetKey = await encryptRecoveryKey(uint8ArrayToBase64(recovery.resetKey), passwordReply, publicKey);

  return dotYouClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/zk-reset', { encryptedResetKey, passwordReply, zkKeys })
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error(error);
      return false;
    });
};
