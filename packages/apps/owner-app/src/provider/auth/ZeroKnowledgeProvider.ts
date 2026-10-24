import { DotYouClient, getDrivesByType } from '@homebase-id/js-lib/core';
import {
  bip39Decode,
  bip39Encode,
  base64ToUint8Array,
  stringGuidsEqual,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import {
  PhraseRecovery,
  ZkConvertDriveRequest,
  ZkKeysRequest,
  ZkPhraseCopiesRequest,
  ZkPhraseRecovery,
  ZkStatus,
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
import { OWNER_ZK_MASTER_KEY } from '@homebase-id/common-app';
import { SHARD_RECOVERY_DRIVE } from '../app/wellKnownDrives';
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

const getZkStatus = async (dotYouClient: DotYouClient): Promise<ZkStatus> =>
  dotYouClient
    .createAxiosClient()
    .get<ZkStatus>('/security/zk')
    .then((response) => response.data);

const saveZkKeys = async (dotYouClient: DotYouClient, request: ZkKeysRequest) =>
  dotYouClient.createAxiosClient().post('/security/zk/keys', request);

// These want the password itself, not just the session, so the login proves it again.
const savePasswordCopy = async (dotYouClient: DotYouClient, password: string, phrasePublicKeyJwk: string) => {
  const [phrasePublicKeyEncryptedPassword, currentAuthenticationPasswordReply] = await Promise.all([
    sealPassword(password, phrasePublicKeyJwk),
    preparePasswordProof(dotYouClient, password),
  ]);
  return dotYouClient
    .createAxiosClient()
    .post('/security/zk/password', { phrasePublicKeyEncryptedPassword, currentAuthenticationPasswordReply });
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

const getShardRecoveryDriveKey = async (dotYouClient: DotYouClient) =>
  (await getDrivesByType(dotYouClient, SHARD_RECOVERY_DRIVE.type, 1, 10)).results.find((drive) =>
    stringGuidsEqual(drive.targetDriveInfo.alias, SHARD_RECOVERY_DRIVE.alias)
  )?.zkMasterKeyEncryptedStorageKey;

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
 * time, writes the password copy when it is missing, converts the Shard Recovery drive when it
 * needs it, and takes the recovery phrase over. Nobody sees any of it. Each step is safe to cut
 * off; the next login picks up where this one stopped.
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
    // Sealed to the phrase's key, so this browser can't check it, only write it when it's missing:
    // a password change writes the new one with the keys.
    if (status.phrasePublicKeyJwk && !status.hasPasswordCopy) {
      await savePasswordCopy(dotYouClient, password, status.phrasePublicKeyJwk);
    }
  }

  await rememberZkMasterKey(dotYouClient, masterKey);

  if (!(await shardRecoveryDriveOpens(shardRecoveryDriveKey, masterKey))) {
    const { request } = await makeZkDriveKeys(SHARD_RECOVERY_DRIVE.alias, masterKey);
    await convertShardRecoveryDrive(dotYouClient, request);
  }

  if (status.recoveryPhrase === 'onServer') {
    await takeOverPhrase(dotYouClient, password, masterKey);
  }
};

/**
 * For a password change: the keys re-locked with the new password, with the new password sealed
 * to the phrase's key. Undefined while the browser has not made them yet; the next login does.
 */
export const relockZkKeysForNewPassword = async (
  dotYouClient: DotYouClient,
  oldPassword: string,
  newPassword: string
): Promise<ZkKeysRequest | undefined> => {
  const status = await getZkStatus(dotYouClient);
  if (!status.zkSaltKek64) return undefined;

  const masterKey = await openZkMasterKey(oldPassword, status);
  return (await makeZkKeys(newPassword, masterKey, status.phrasePublicKeyJwk)).request;
};

/** Where the recovery phrase is, for the security screens. */
export const getRecoveryPhraseState = async (dotYouClient: DotYouClient) =>
  (await getZkStatus(dotYouClient)).recoveryPhrase;

const requireZkMasterKey = async (dotYouClient: DotYouClient, toDo: string) => {
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
): Promise<PhraseRecovery | 'notTakenOver' | 'needsReentry'> => {
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
 * junk): the phrase's reset key sets a new one, and the recovered zero-knowledge master key is
 * locked by it. The reset key goes encrypted to the host's key, as the old reset sends the phrase.
 */
export const resetPasswordWithPhrase = async (
  dotYouClient: DotYouClient,
  recovery: PhraseRecovery,
  newPassword: string
): Promise<boolean> => {
  const [passwordReply, zkKeys, publicKey] = await Promise.all([
    getSalts(dotYouClient).then((salts) => prepareAuthPassword(newPassword, salts)),
    makeZkKeys(newPassword, recovery.zkMasterKey, recovery.phrasePublicKeyJwk).then((keys) => keys.request),
    getPublicKey(dotYouClient),
  ]);
  const encryptedResetKey = await encryptRecoveryKey(uint8ArrayToBase64(recovery.resetKey), passwordReply, publicKey);

  return dotYouClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/zk-phrase-reset', { encryptedResetKey, passwordReply, zkKeys })
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error(error);
      return false;
    });
};
