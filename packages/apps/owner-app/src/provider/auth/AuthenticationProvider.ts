import { base64ToUint8Array } from '@homebase-id/js-lib/helpers';
import { OwnerClient } from '@homebase-id/common-app';
import { NonceData, encryptRecoveryKey, prepareAuthPassword } from './AuthenticationHelper';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';

interface AuthenticationResponse {
  sharedSecret: Uint8Array;
}

// Authenticate the owner
export const authenticate = async (password: string): Promise<AuthenticationResponse | null> => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const noncePackage = await getNonce(odinClient);
  const reply = await prepareAuthPassword(password, noncePackage);

  const client = odinClient.createAxiosClient({ overrideEncryption: true });
  const url = '/authentication';

  const response = await client.post(url, reply);

  if (response.status === 200) {
    const authResponse: AuthenticationResponse = {
      sharedSecret: base64ToUint8Array(response.data.sharedSecret),
    };
    return authResponse;
  }

  return null;
};

export const setFirstPassword = async (
  newPassword: string,
  firstRunToken: string
): Promise<boolean> => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const salts = await getSalts(odinClient);
  const reply = await prepareAuthPassword(newPassword, salts);

  return odinClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/passwd', { ...reply, firstRunToken })
    .then((response) => {
      return response.status === 200;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
};

export const resetPassword = async (newPassword: string, recoveryKey: string): Promise<boolean> => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const salts = await getSalts(odinClient);
  const passwordReply = await prepareAuthPassword(newPassword, salts);

  const publicKey = await getPublicKey(odinClient);
  const encryptedRecoveryKey = await encryptRecoveryKey(recoveryKey, passwordReply, publicKey);

  return odinClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/resetpasswdrk', { passwordReply, encryptedRecoveryKey })
    .then((response) => {
      return response.status === 200;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
};

export const changePassword = async (
  odinClient: OdinClient,
  oldPassword: string,
  newPassword: string
): Promise<boolean> => {
  const noncePackage = await getNonce(odinClient);
  const currentAuthenticationPasswordReply = await prepareAuthPassword(oldPassword, noncePackage);

  const salts = await getSalts(odinClient);
  const newPasswordReply = await prepareAuthPassword(newPassword, salts);

  return odinClient
    .createAxiosClient({ overrideEncryption: false })
    .post('/security/resetpasswd', { currentAuthenticationPasswordReply, newPasswordReply })
    .then((response) => {
      return response.status === 200;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
};

export const finalizeRegistration = async (firstRunToken: string) => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });
  const client = odinClient.createAxiosClient({ overrideEncryption: true });
  const url = '/config/registration/finalize?frid=' + firstRunToken;

  return await client.get(url).then((response) => {
    return response.data;
  });
};

export const isPasswordSet = async (): Promise<boolean> => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });

  return odinClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/ispasswordset')
    .then((response) => {
      return response.data == true;
    });
};

/// Internal helpers
export const getNonce = async (odinClient: OdinClient): Promise<NonceData> => {
  const client = odinClient.createAxiosClient({ overrideEncryption: true });
  return client
    .get('/authentication/nonce')
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

const getSalts = async (odinClient: OdinClient): Promise<NonceData> => {
  const client = odinClient.createAxiosClient({ overrideEncryption: true });
  return client.get('/authentication/getsalts').then((response) => {
    return response.data;
  });
};

export interface PublicKeyData {
  publicKeyJwkBase64Url: string;
  crC32c: number;
  expiration: number;
}

const getPublicKey = async (odinClient: OdinClient): Promise<PublicKeyData> => {
  const client = odinClient.createAxiosClient({ overrideEncryption: true });
  return client
    .get<PublicKeyData>('/authentication/publickey_ecc?keyType=offlineKey')
    .then((response) => {
      return response.data;
    });
};
