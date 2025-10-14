import {ApiType, getKnownOdinErrorMessages} from '@homebase-id/js-lib/core';
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

  AwaitingOwnerFinalization = "awaitingOwnerFinalization"
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

export const initiateRecoveryMode = async () => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`${root}/initiate-recovery-mode`)
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