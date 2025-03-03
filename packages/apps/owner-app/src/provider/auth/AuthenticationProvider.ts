import { base64ToUint8Array } from '@homebase-id/js-lib/helpers';
import { OwnerClient } from '@homebase-id/common-app';
import { NonceData, encryptRecoveryKey, prepareAuthPassword } from './AuthenticationHelper';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';

interface AuthenticationResponse {
  sharedSecret: Uint8Array;
}

// Authenticate the owner
export const authenticate = async (password: string): Promise<AuthenticationResponse | null> => {
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const noncePackage = await getNonce(dotYouClient);
  const reply = await prepareAuthPassword(password, noncePackage);

  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
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
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const salts = await getSalts(dotYouClient);
  const reply = await prepareAuthPassword(newPassword, salts);

  return dotYouClient
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
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  const salts = await getSalts(dotYouClient);
  const passwordReply = await prepareAuthPassword(newPassword, salts);

  const publicKey = await getPublicKey(dotYouClient);
  const encryptedRecoveryKey = await encryptRecoveryKey(recoveryKey, passwordReply, publicKey);

  return dotYouClient
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
  dotYouClient: DotYouClient,
  oldPassword: string,
  newPassword: string
): Promise<boolean> => {
  const noncePackage = await getNonce(dotYouClient);
  const currentAuthenticationPasswordReply = await prepareAuthPassword(oldPassword, noncePackage);

  const salts = await getSalts(dotYouClient);
  const newPasswordReply = await prepareAuthPassword(newPassword, salts);

  return dotYouClient
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
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const url = '/config/registration/finalize?frid=' + firstRunToken;

  return await client.get(url).then((response) => {
    return response.data;
  });
};

export const isPasswordSet = async (): Promise<boolean> => {
  const dotYouClient = new OwnerClient({
    api: ApiType.Owner,
  });

  return dotYouClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/ispasswordset')
    .then((response) => {
      return response.data == true;
    });
};

/// Internal helpers
export const getNonce = async (dotYouClient: DotYouClient): Promise<NonceData> => {
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  return client
    .get('/authentication/nonce')
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

const getSalts = async (dotYouClient: DotYouClient): Promise<NonceData> => {
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  return client.get('/authentication/getsalts').then((response) => {
    return response.data;
  });
};

export interface PublicKeyData {
  publicKeyJwkBase64Url: string;
  crC32c: number;
  expiration: number;
}

const getPublicKey = async (dotYouClient: DotYouClient): Promise<PublicKeyData> => {
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  return client
    .get<PublicKeyData>('/authentication/publickey_ecc?keyType=offlineKey')
    .then((response) => {
      return response.data;
    });
};
