import {ApiType} from '@homebase-id/js-lib/core';
import {OwnerClient} from "@homebase-id/common-app";
import {encryptRecoveryKey, prepareAuthPassword} from "./AuthenticationHelper";
import {getNonce, getPublicKey, getSalts} from "./AuthenticationProvider";

export interface VerificationStatus {
  passwordLastVerified: number,
  recoveryKeyLastVerified: number,
  distributedRecoveryLastVerified: number
}

const root = "/security/recovery"


export const getVerificationStatus = async (): Promise<VerificationStatus | null> => {

  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const client = dotYouClient.createAxiosClient({overrideEncryption: false});

  const url = `${root}/verification-status`;
  return await client
    .get<VerificationStatus>(url)
    .then((response) => {
      console.log("getVerificationStatus");
      console.log(response);
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
  const passwordReply = await prepareAuthPassword("some thing to toss away", salts);

  const encryptedRecoveryKey = await encryptRecoveryKey(recoveryKey, passwordReply, publicKey);

  const client = dotYouClient.createAxiosClient({overrideEncryption: true});
  const url = `${root}/verify-recovery-key`;

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
  const url = `${root}/verify-password`;

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
