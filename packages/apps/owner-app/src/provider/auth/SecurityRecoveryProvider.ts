import {ApiType} from '@homebase-id/js-lib/core';
import {OwnerClient} from "@homebase-id/common-app";
import {encryptRecoveryKey, prepareAuthPassword} from "./AuthenticationHelper";
import {getNonce, getPublicKey, getSalts} from "./AuthenticationProvider";

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

  AwaitingOwnerFinalization = "awaitingOwnerFinalization"
}

export interface FinalRecoveryResult {
  recoveryText: string
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

export const getFinalRecoveryResult = async (id: string, fk: string): Promise<FinalRecoveryResult> => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`${root}/finalize`, {
      id: id,
      finalKey: fk
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
};

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

export const initiateRecoveryMode = async () => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`${root}/initiate-recovery-mode`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
};


export const verifyRecoveryKey = async (recoveryKey: string): Promise<boolean> => {
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const publicKey = await getPublicKey(dotYouClient);
  const salts = await getSalts(dotYouClient);
  const passwordReply = await prepareAuthPassword("some thign to toss away", salts);

  const encryptedRecoveryKey = await encryptRecoveryKey(recoveryKey, passwordReply, publicKey);

  const client = dotYouClient.createAxiosClient({overrideEncryption: true});
  const url = '/security/recovery/verify-recovery-key';

  return await client.post(url, {encryptedRecoveryKey})
    .then((response) => {
      return response.status === 200;
    })
    .catch((error) => {
      if (error.response?.status === 403) {
        return false;
      }
      console.error(error);
      return false;
    });
};

// Verifies the password without logging in the owner (i.e. changing cookies, etc.)
export const verifyPassword = async (password: string): Promise<boolean> => {
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const noncePackage = await getNonce(dotYouClient);
  const reply = await prepareAuthPassword(password, noncePackage);

  const client = dotYouClient.createAxiosClient({overrideEncryption: true});
  const url = '/security/recovery/verify-password';

  return await client.post(url, reply)
    .then((response) => {
      return response.status === 200;
    })
    .catch((error) => {
      if (error.response?.status === 403) {
        return false;
      }
      console.error(error);
      return false;
    });
};
