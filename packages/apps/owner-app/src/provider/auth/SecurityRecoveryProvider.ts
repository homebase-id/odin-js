import {ApiType, getKnownOdinErrorMessages} from '@homebase-id/js-lib/core';
import {base64ToUint8Array, uint8ArrayToBase64} from '@homebase-id/js-lib/helpers';
import {PasswordRecovery, createExportedEccPair, recoverWithFriends} from '@homebase-id/js-lib/auth';
import {OwnerClient} from "@homebase-id/common-app";
import {prepareAuthPassword} from "./AuthenticationHelper";
import {getSalts} from "./AuthenticationProvider";

export enum ShamirRecoveryState {

  None = 'none',

  /**
   * Email was sent to owner; we are waiting for the owner to click the email link to verify
   */
  AwaitingOwnerEmailVerificationToEnterRecoveryMode = "awaitingOwnerEmailVerificationToEnterRecoveryMode",

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


export const exitRecoveryMode = async () => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`${root}/exit-recovery-mode`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
};

// Recovery with friends must finish in the browser that started it: the friends seal their shards to
// this throwaway key pair, kept here while recovery is under way and forgotten once it ends (the
// recovery page sees no recovery, or a reset succeeded). The private key never leaves this browser.
const RECOVERY_KEY_STORAGE = 'shamir-recovery-key';

interface RecoveryKeyPair {
  publicKeyJwk: string;
  privateKey64: string;
}

const getStoredRecoveryKey = (): RecoveryKeyPair | null => {
  try {
    const stored = window.localStorage.getItem(RECOVERY_KEY_STORAGE);
    return stored ? (JSON.parse(stored) as RecoveryKeyPair) : null;
  } catch {
    return null;
  }
};

/**
 * This browser's throwaway key pair. Kept while a recovery is under way, so sending the email again
 * doesn't break the first one; a new recovery gets a new pair.
 */
const getOrMakeRecoveryKey = async (recoveryUnderWay: boolean): Promise<RecoveryKeyPair> => {
  const stored = getStoredRecoveryKey();
  if (stored && recoveryUnderWay) return stored;

  const pair = await createExportedEccPair();
  const key: RecoveryKeyPair = {publicKeyJwk: pair.publicKeyJwk, privateKey64: uint8ArrayToBase64(pair.privateKeyPkcs8)};
  window.localStorage.setItem(RECOVERY_KEY_STORAGE, JSON.stringify(key));
  return key;
};

export const forgetRecoveryKey = () => window.localStorage.removeItem(RECOVERY_KEY_STORAGE);

export const hasRecoveryKey = () => !!getStoredRecoveryKey();

/**
 * The email link's step: posts its nonce with this browser's public key. Entering recovery with
 * friends must come from the browser that started it, so another browser is refused.
 */
export const enterRecoveryMode = async (id: string): Promise<string | null> => {
  return dotYouClient
    .createAxiosClient()
    .post(`${root}/verify-enter`, {id, recoveryPublicKeyJwk: getStoredRecoveryKey()?.publicKeyJwk})
    .then(() => null)
    .catch((error) => {
      console.warn(error);
      return getKnownOdinErrorMessages(error) ?? 'This link has expired or was already used. Start recovery again.';
    });
};

/**
 * Recovery with friends, once enough approved: the password, rebuilt in this browser only. The
 * throwaway key goes as soon as the bundle opens: whoever later reads it here could open the bundle
 * too. The caller keeps the result in memory for the reset step.
 */
export const recoverWithApprovedFriends = async (): Promise<PasswordRecovery> => {
  const key = getStoredRecoveryKey();
  if (!key) throw new Error('This browser did not start the recovery');

  const sealedBundle64 = await dotYouClient
    .createAxiosClient()
    .get<{ sealedBundle64: string }>(`${root}/recovery-bundle`)
    .then((response) => response.data.sealedBundle64);
  const recovered = await recoverWithFriends(sealedBundle64, base64ToUint8Array(key.privateKey64));
  forgetRecoveryKey();
  return recovered;
};

/** `underWay`: a recovery started here is pending, so its key (and its earlier email) stays valid. */
export const initiateRecoveryMode = async (underWay: boolean) => {
  const axiosClient = dotYouClient.createAxiosClient();
  const {publicKeyJwk} = await getOrMakeRecoveryKey(underWay);
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