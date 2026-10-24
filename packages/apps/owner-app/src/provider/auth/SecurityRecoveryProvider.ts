import {ApiType, getKnownOdinErrorMessages} from '@homebase-id/js-lib/core';
import {base64ToUint8Array, uint8ArrayToBase64} from '@homebase-id/js-lib/helpers';
import {PasswordRecovery, createExportedEccPair, recoverWithFriends, sealKeyId} from '@homebase-id/js-lib/auth';
import {OwnerClient} from "@homebase-id/common-app";
import {prepareAuthPassword} from "./AuthenticationHelper";
import {getSalts} from "./AuthenticationProvider";

export enum ShamirRecoveryState {

  None = 'none',

  /**
   * Email was sent to owner; we are waiting for the owner to click the email link to verify
   */
  AwaitingOwnerEmailVerificationToEnterRecoveryMode = "awaitingOwnerEmailVerificationToEnterRecoveryMode",

  /** No longer set by the server: asking to exit only sends the email. A status stored before still reads. */
  AwaitingOwnerEmailVerificationToExitRecoveryMode = "awaitingOwnerEmailVerificationToExitRecoveryMode",

  /**
   * Players have been notified this owner needs their shards.
   * We are waiting for enough players to send their shard to this owner
   */
  AwaitingSufficientDelegateConfirmation = "awaitingSufficientDelegateConfirmation",

  AwaitingOwnerFinalization = "awaitingOwnerFinalization",

  /**
   * Recovery with friends: enough friends approved. The browser that started recovery fetches their
   * shards, sealed to its throwaway key, and rebuilds the secret itself.
   */
  AwaitingRecoveringBrowser = "awaitingRecoveringBrowser"
}

// Status type
export interface ShamirRecoveryStatusRedacted {
  updated: number; // Unix timestamp (UTC)
  email: string;
  state: ShamirRecoveryState;
  /** The throwaway key the recovery is for, pending or under way (sealKeyId), or null when none. */
  recoveryKeyId?: number | null;
}

const root = "/security/recovery"
const dotYouClient = new OwnerClient({
  api: ApiType.Owner,
});

export const getRecoveryStatus = async (): Promise<ShamirRecoveryStatusRedacted> => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .get(`${root}/status`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
};

export const finalizeRecovery = async (id: string, fk: string, newPassword: string): Promise<boolean> => {
  const axiosClient = dotYouClient.createAxiosClient();

  const salts = await getSalts(dotYouClient);
  const passwordReply = await prepareAuthPassword(newPassword, salts);

  return await axiosClient
    .post(`${root}/finalize`, {
      id: id,
      finalKey: fk,
      passwordReply: passwordReply
    })
    .then((response) => {
      return response.status == 200;
    })
    .catch((error) => {
      console.warn(error);
      return false;
    });
};


/**
 * Asks to leave recovery mode. Only the email goes out: nothing changes until the owner confirms
 * with it, so the page says so itself. True when the email was sent.
 */
export const exitRecoveryMode = async (): Promise<boolean> => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`${root}/exit-recovery-mode`)
    .then(() => true)
    .catch((error) => {
      console.warn(error);
      return false;
    });
};

// Recovery with friends must finish in the browser that started it: the friends seal their shards to
// this throwaway key pair. The private key never leaves this browser. It is this browser's only while
// the server says the recovery (pending or under way) is for it: status.recoveryKeyId. It is
// forgotten when a status read shows the recovery is over or another browser's, after a reset, and
// at the owner's login.
const RECOVERY_KEY_STORAGE = 'shamir-recovery-key';

// A key this young may belong to a start whose status the server hasn't written yet (a poll answered
// before the initiate request), so a status read doesn't forget it
const FORGET_GRACE_MS = 2 * 60 * 1000;

interface RecoveryKeyPair {
  publicKeyJwk: string;
  privateKey64: string;
  /** When this browser made it (ms) */
  created: number;
}

const getStoredRecoveryKey = (): RecoveryKeyPair | null => {
  try {
    const stored = window.localStorage.getItem(RECOVERY_KEY_STORAGE);
    return stored ? (JSON.parse(stored) as RecoveryKeyPair) : null;
  } catch {
    return null;
  }
};

export const forgetRecoveryKey = () => window.localStorage.removeItem(RECOVERY_KEY_STORAGE);

/** Forgets `key` only if it is still the one stored: another tab may have stored a new one since. */
const forgetIfStillStored = (key: RecoveryKeyPair) => {
  if (getStoredRecoveryKey()?.publicKeyJwk === key.publicKeyJwk) forgetRecoveryKey();
};

const isFor = async (key: RecoveryKeyPair | null, recoveryKeyId: number | null | undefined) =>
  !!key && recoveryKeyId != null && (await sealKeyId(key.publicKeyJwk)) === recoveryKeyId;

const isUnderWay = (status: ShamirRecoveryStatusRedacted | null) =>
  !!status &&
  status.state !== ShamirRecoveryState.None &&
  status.state !== ShamirRecoveryState.AwaitingOwnerEmailVerificationToEnterRecoveryMode;

/**
 * The status, and whether the recovery it shows (pending or under way) is this browser's, from one
 * read of the stored key. A key past its grace is forgotten when the recovery is over or another
 * browser's.
 */
export const getRecoveryStatusForThisBrowser = async (): Promise<{
  status: ShamirRecoveryStatusRedacted | null;
  thisBrowser: boolean;
}> => {
  const status = await getRecoveryStatus();
  const key = getStoredRecoveryKey();
  const thisBrowser = await isFor(key, status?.recoveryKeyId);
  if (status && key && !thisBrowser && Date.now() - key.created > FORGET_GRACE_MS) {
    const over = status.state === ShamirRecoveryState.None;
    const anotherBrowsers = status.recoveryKeyId != null;
    if (over || anotherBrowsers) forgetIfStillStored(key);
  }
  return {status, thisBrowser};
};

/**
 * The key to start or restart recovery with, from a fresh status: the stored one if the recovery
 * (pending or under way) is for it, so "send it again" and "start over" keep this browser's links
 * working; otherwise a new pair. Throws when a recovery is under way in another browser: the server
 * would ignore the start, and replacing the key here would only lose it.
 */
const getOrMakeRecoveryKey = async (): Promise<RecoveryKeyPair> => {
  const status = await getRecoveryStatus();
  const stored = getStoredRecoveryKey();
  if (await isFor(stored, status?.recoveryKeyId)) return stored!;

  if (isUnderWay(status) && status!.recoveryKeyId != null) {
    throw new Error('Recovery is under way in another browser; finish it there, or exit it by email first');
  }

  const pair = await createExportedEccPair();
  const key: RecoveryKeyPair = {
    publicKeyJwk: pair.publicKeyJwk,
    privateKey64: uint8ArrayToBase64(pair.privateKeyPkcs8),
    created: Date.now(),
  };
  window.localStorage.setItem(RECOVERY_KEY_STORAGE, JSON.stringify(key));
  return key;
};

/**
 * The email link's step: posts its nonce with this browser's public key. Entering recovery with
 * friends must come from the browser that started it, so another browser is refused.
 */
export const enterRecoveryMode = async (id: string): Promise<string | null> => {
  const key = getStoredRecoveryKey();
  return dotYouClient
    .createAxiosClient()
    .post(`${root}/verify-enter`, {id, recoveryPublicKeyJwk: key?.publicKeyJwk})
    .then(() => null)
    .catch((error) => {
      console.warn(error);
      // With no key here this can't be the browser that started it (an automated recovery needs none)
      if (!key) return 'Open the link in the browser where you started recovery.';
      return getKnownOdinErrorMessages(error) ?? 'This link has expired or was already used. Start recovery again.';
    });
};

/**
 * Recovery with friends, once enough approved: the password, rebuilt in this browser only. The key
 * stays until the recovery ends, so a reload can open the bundle again.
 */
export const recoverWithApprovedFriends = async (): Promise<PasswordRecovery> => {
  const key = getStoredRecoveryKey();
  if (!key) throw new Error('This browser did not start the recovery');

  const sealedBundle64 = await dotYouClient
    .createAxiosClient()
    .get<{ sealedBundle64: string }>(`${root}/recovery-bundle`)
    .then((response) => response.data.sealedBundle64);
  return recoverWithFriends(sealedBundle64, base64ToUint8Array(key.privateKey64));
};

/** Starts recovery, or sends the email again ("send it again", "start over"). */
export const initiateRecoveryMode = async () => {
  const axiosClient = dotYouClient.createAxiosClient();
  const {publicKeyJwk} = await getOrMakeRecoveryKey();
  return await axiosClient
    .post(`${root}/initiate-recovery-mode`, {recoveryPublicKeyJwk: publicKeyJwk})
    .then((response) => {
      return response.data;
    })
    .catch((error) => {

      if (error.response?.status === 400) {
        const knownErrorText = getKnownOdinErrorMessages(error);

        if (knownErrorText) {
          throw new Error(knownErrorText)
        }

        throw new Error("An unknown error occurred.");

      }
      console.error("Failed to initiate recovery mode:", error);
      return null;
    });
};
