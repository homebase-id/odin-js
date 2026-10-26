import {ApiType, getKnownOdinErrorMessages} from '@homebase-id/js-lib/core';
import {base64ToUint8Array, uint8ArrayToBase64} from '@homebase-id/js-lib/helpers';
import {
  BundleRecovery,
  RecoverySlot,
  createExportedEccPair,
  openRecoverySlots,
  recoverFromBundle,
  sealKeyId,
} from '@homebase-id/js-lib/auth';
import {OwnerClient} from "@homebase-id/common-app";
import {prepareAuthPassword} from "./AuthenticationHelper";
import {getSalts} from "./AuthenticationProvider";

export enum ShamirRecoveryState {

  None = 'none',

  /**
   * Email was sent to owner; we are waiting for the owner to click the email link to verify
   */
  AwaitingOwnerEmailVerificationToEnterRecoveryMode = "awaitingOwnerEmailVerificationToEnterRecoveryMode",

  /**
   * Players have been notified this owner needs their shards.
   * We are waiting for enough players to send their shard to this owner
   */
  AwaitingSufficientDelegateConfirmation = "awaitingSufficientDelegateConfirmation",

  /**
   * Enough shards are in. The browser that started recovery fetches them, sealed to its throwaway
   * key, and rebuilds the secret itself.
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
  /** While shards are collected: how many the recovery needs, and how many are in. */
  needed?: number | null;
  filled?: number | null;
  /** While shards are collected: the holders and which are in, sealed to the browser that started. */
  sealedSlots64?: string | null;
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

/**
 * A server-made deal's recovery (dealt before the browser dealt every deal): the secret this browser
 * rebuilt, with a new password. True when the password was set.
 */
export const finalizeRecovery = async (secret: Uint8Array, newPassword: string): Promise<boolean> => {
  const axiosClient = dotYouClient.createAxiosClient();

  const salts = await getSalts(dotYouClient);
  const passwordReply = await prepareAuthPassword(newPassword, salts);

  return await axiosClient
    .post(`${root}/finalize`, {
      secret64: uint8ArrayToBase64(secret),
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

// Recovery must finish in the browser that started it: every holder seals its shard to this
// throwaway key pair. The private key never leaves this browser. It is this browser's only while
// the server says the recovery (pending or under way) is for it: status.recoveryKeyId. It is
// forgotten when a status read shows no recovery, or one under way for another browser's key, after
// a reset, and at the owner's login. A pending start never makes it go: its key id is only the last
// start's, and anyone can start one.
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

/** The 9023 text, from KnownErrors: one source for the page and the refusal here. */
export const recoveryUnderWayElsewhereMessage = () =>
  getKnownOdinErrorMessages({errorCode: 'recoveryUnderWayElsewhere'}) as string;

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
 * The status, from one read of the stored key:
 * - `thisBrowser`: the recovery it shows (pending or under way) is for the stored key;
 * - `elsewhere`: a recovery is under way for another browser's key.
 *
 * A key past its grace is forgotten when there is no recovery, or one under way elsewhere; never for
 * a pending start, which anyone can make.
 */
export const getRecoveryStatusForThisBrowser = async (): Promise<{
  status: ShamirRecoveryStatusRedacted | null;
  thisBrowser: boolean;
  elsewhere: boolean;
}> => {
  const status = await getRecoveryStatus();
  const key = getStoredRecoveryKey();
  const thisBrowser = await isFor(key, status?.recoveryKeyId);
  const elsewhere = isUnderWay(status) && status?.recoveryKeyId != null && !thisBrowser;
  if (status && key && !thisBrowser && Date.now() - key.created > FORGET_GRACE_MS) {
    if (status.state === ShamirRecoveryState.None || elsewhere) forgetIfStillStored(key);
  }
  return {status, thisBrowser, elsewhere};
};

/**
 * The key to start or restart recovery with, from a fresh status: the stored one whenever no
 * recovery is under way elsewhere, so "send it again" and "start over" keep this browser's earlier
 * links working, even after someone else started one (a pending start is only the last one); a new
 * pair when none is stored. Throws when a recovery is under way in another browser (the server would
 * ignore the start, and replacing the key here would only lose it), and when the status can't be read
 * (it can't tell whether a recovery is under way elsewhere).
 */
const getOrMakeRecoveryKey = async (): Promise<RecoveryKeyPair> => {
  const {status, elsewhere} = await getRecoveryStatusForThisBrowser();
  if (!status) throw new Error("Couldn't check the recovery's status; try again");
  if (elsewhere) throw new Error(recoveryUnderWayElsewhereMessage());

  const stored = getStoredRecoveryKey();
  if (stored) return stored;

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
 * The email link's step: posts its nonce with this browser's public key. Entering recovery must come
 * from the browser that started it, so another browser is refused.
 */
export const enterRecoveryMode = async (id: string): Promise<string | null> => {
  const key = getStoredRecoveryKey();
  return dotYouClient
    .createAxiosClient()
    .post(`${root}/verify-enter`, {id, recoveryPublicKeyJwk: key?.publicKeyJwk})
    .then(() => null)
    .catch((error) => {
      console.warn(error);
      // With no key here this can't be the browser that started it
      if (!key) return 'Open the link in the browser where you started recovery.';
      return getKnownOdinErrorMessages(error) ?? 'This link has expired or was already used. Start recovery again.';
    });
};

/**
 * Once enough shards are in: the password, rebuilt in this browser only (or, for a server-made deal,
 * the secret to set a new one with). The key stays until the recovery ends, so a reload can open the
 * bundle again.
 */
export const recoverInThisBrowser = async (): Promise<BundleRecovery> => {
  const key = getStoredRecoveryKey();
  if (!key) throw new Error('This browser did not start the recovery');

  const sealedBundle64 = await dotYouClient
    .createAxiosClient()
    .get<{ sealedBundle64: string }>(`${root}/recovery-bundle`)
    .then((response) => response.data.sealedBundle64);
  return recoverFromBundle(sealedBundle64, base64ToUint8Array(key.privateKey64));
};

/** The holders and which are in, when this browser started the recovery; null otherwise. */
export const openSlots = async (status: ShamirRecoveryStatusRedacted | null): Promise<RecoverySlot[] | null> => {
  const key = getStoredRecoveryKey();
  if (!key || !status?.sealedSlots64) return null;

  try {
    return await openRecoverySlots(status.sealedSlots64, base64ToUint8Array(key.privateKey64));
  } catch {
    return null;
  }
};

/**
 * The link from an automatic holder's email, clicked on any device: hands its code to the holder,
 * which releases its shard sealed to the browser that started. Null when it worked; otherwise the
 * message to show.
 */
export const fillSlot = async (shardId: string, code: string): Promise<string | null> =>
  dotYouClient
    .createAxiosClient()
    .post(`${root}/fill-slot`, {shardId, code})
    .then(() => null)
    .catch((error) => {
      console.warn(error);
      if (error?.response?.data?.errorCode === 'recoveryNotReady') {
        return 'There is no recovery under way any more. Start over to get new emails.';
      }
      return getKnownOdinErrorMessages(error) ?? 'This link did not work just now. Try it again, or use the newest email.';
    });

/**
 * Starts recovery, or sends the email again ("send it again", "start over"). True when the email
 * was asked for; throws with a message to show (translation key) when refused.
 */
export const initiateRecoveryMode = async (): Promise<boolean> => {
  const axiosClient = dotYouClient.createAxiosClient();
  const {publicKeyJwk} = await getOrMakeRecoveryKey();
  return await axiosClient
    .post(`${root}/initiate-recovery-mode`, {recoveryPublicKeyJwk: publicKeyJwk})
    .then(() => true)
    .catch((error) => {

      if (error.response?.status === 400) {
        const knownErrorText = getKnownOdinErrorMessages(error);

        if (knownErrorText) {
          throw new Error(knownErrorText)
        }

        throw new Error("An unknown error occurred.");

      }
      console.error("Failed to initiate recovery mode:", error);
      return false;
    });
};
