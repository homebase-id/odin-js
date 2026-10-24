import { DotYouClient, getDrivesByType } from '@homebase-id/js-lib/core';
import {
  bip39Decode,
  bip39Encode,
  base64ToUint8Array,
  stringGuidsEqual,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import {
  ZkConvertDriveRequest,
  ZkKeysRequest,
  ZkPhraseCopiesRequest,
  ZkPhraseRecovery,
  ZkStatus,
  getPhraseCheck,
  getResetKey,
  makePhraseCopies,
  makeZkDriveKeys,
  makeZkKeys,
  openPassword,
  openZkMasterKey,
  recoverWithPhrase,
  lockPassword,
  zkLock,
  zkOpen,
} from '@homebase-id/js-lib/auth';
import { OWNER_ZK_MASTER_KEY } from '@homebase-id/common-app';
import { SHARD_RECOVERY_DRIVE } from '../app/wellKnownDrives';
import { getSalts, prepareAuthPassword, preparePasswordProof } from './AuthenticationHelper';

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

// These two want the password itself, not just the session, so the login proves it again.
const savePasswordCopy = async (dotYouClient: DotYouClient, password: string, zkMasterKeyEncryptedPassword: string) =>
  dotYouClient.createAxiosClient().post('/security/zk/password', {
    zkMasterKeyEncryptedPassword,
    currentAuthenticationPasswordReply: await preparePasswordProof(dotYouClient, password),
  });

const handOverPhrase = async (dotYouClient: DotYouClient, password: string) =>
  dotYouClient
    .createAxiosClient()
    .post<{ phrase: string }>('/security/zk/phrase-handover', {
      currentAuthenticationPasswordReply: await preparePasswordProof(dotYouClient, password),
    })
    .then((response) => response.data.phrase);

const takeOverPhrase = async (dotYouClient: DotYouClient, password: string, request: ZkPhraseCopiesRequest) =>
  dotYouClient.createAxiosClient().post('/security/zk/phrase-takeover', {
    ...request,
    currentAuthenticationPasswordReply: await preparePasswordProof(dotYouClient, password),
  });

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
 * time, keeps the password copy current, converts the Shard Recovery drive when it needs it, and
 * takes the recovery phrase over. Nobody sees any of it. Each step is safe to cut off; the next
 * login picks up where this one stopped.
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
    if (!(await passwordCopyMatches(status, masterKey, password))) {
      await savePasswordCopy(dotYouClient, password, await lockPassword(password, masterKey));
    }
  }

  await rememberZkMasterKey(dotYouClient, masterKey);

  if (!(await shardRecoveryDriveOpens(shardRecoveryDriveKey, masterKey))) {
    const { request } = await makeZkDriveKeys(SHARD_RECOVERY_DRIVE.alias, masterKey);
    await convertShardRecoveryDrive(dotYouClient, request);
  }

  if (status.recoveryPhrase === 'onServer') {
    const phrase = await handOverPhrase(dotYouClient, password);
    await takeOverPhrase(dotYouClient, password, await makePhraseCopies(phrase, masterKey));
  }
};

const passwordCopyMatches = async (status: ZkStatus, masterKey: Uint8Array, password: string) => {
  if (!status.zkMasterKeyEncryptedPassword) return false;
  try {
    return (await openPassword(status.zkMasterKeyEncryptedPassword, masterKey)) === password;
  } catch {
    return false;
  }
};

/**
 * For a password change: the keys re-locked with the new password, with the new password copy.
 * Undefined while the browser has not made them yet; the next login does.
 */
export const relockZkKeysForNewPassword = async (
  dotYouClient: DotYouClient,
  oldPassword: string,
  newPassword: string
): Promise<ZkKeysRequest | undefined> => {
  const status = await getZkStatus(dotYouClient);
  if (!status.zkSaltKek64) return undefined;

  const masterKey = await openZkMasterKey(oldPassword, status);
  return (await makeZkKeys(newPassword, masterKey)).request;
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

/** After a reset forgot the phrase copies: lock the new zero-knowledge master key with the typed phrase. */
export const reenterRecoveryPhrase = async (dotYouClient: DotYouClient, phrase: string) => {
  const masterKey = await requireZkMasterKey(dotYouClient, 'keep your recovery phrase');
  await dotYouClient.createAxiosClient().post('/security/zk/phrase-reentry', await makePhraseCopies(phrase, masterKey));
};

/**
 * Recovery with the phrase, with no login: the password, opened in this browser only, and the
 * zero-knowledge master key, for a reset if that password no longer logs in. Undefined when the
 * phrase was not taken over yet; the page then uses the old reset.
 */
export const recoverFromPhrase = async (
  dotYouClient: DotYouClient,
  phrase: string
): Promise<{ password: string; zkMasterKey: Uint8Array } | undefined> => {
  const recovery = await dotYouClient
    .createAxiosClient()
    .get<ZkPhraseRecovery>('/authentication/zk-phrase-recovery', { validateStatus: (s) => s === 200 || s === 404 })
    .then((response) => (response.status === 200 ? response.data : undefined));
  if (!recovery) return undefined;

  return recoverWithPhrase(phrase, recovery);
};

/**
 * When the recovered password doesn't log in (someone with the password rewrote it): the phrase's
 * reset key sets a new one, and the recovered zero-knowledge master key is locked by it.
 */
export const resetPasswordWithPhrase = async (
  dotYouClient: DotYouClient,
  zkMasterKey: Uint8Array,
  newPassword: string
): Promise<boolean> => {
  const passwordReply = await prepareAuthPassword(newPassword, await getSalts(dotYouClient));
  const zkKeys = (await makeZkKeys(newPassword, zkMasterKey)).request;
  const resetKey64 = uint8ArrayToBase64(await getResetKey(zkMasterKey));

  return dotYouClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/zk-phrase-reset', { resetKey64, passwordReply, zkKeys })
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error(error);
      return false;
    });
};
