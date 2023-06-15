import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { OwnerClient, logoutOwner, hasValidOwnerToken } from '@youfoundation/common-app';
import { NonceData, prepareAuthPassword } from './AuthenticationHelper';
import { ApiType } from '@youfoundation/js-lib/core';

interface AuthenticationResponse {
  sharedSecret: Uint8Array;
}

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = hasValidOwnerToken;
export const logout = logoutOwner;

// Authenticate the owner
export const authenticate = async (password: string): Promise<AuthenticationResponse | null> => {
  const noncePackage = await getNonce();
  const reply = await prepareAuthPassword(password, noncePackage);

  const dotYouClient = new OwnerClient({ api: ApiType.Owner });
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

// Authenticate for a third party
export const createHomeToken = async (returnUrl: string): Promise<boolean> => {
  returnUrl = `${returnUrl}${returnUrl.indexOf('?') !== -1 ? '&' : '?'}identity=${
    window.location.hostname
  }`;
  const url = `/youauth/create-token-flow?returnUrl=${encodeURIComponent(returnUrl)}`;

  // it's a chain of redirects from the server, we don't need to trigger with a xhr request
  window.location.href = `https://api.${window.location.host}/api/owner/v1${url}`;

  return true;
};

export const setNewPassword = async (
  newPassword: string,
  firstRunToken: string
): Promise<boolean> => {
  return getSalts().then((salts) => {
    return prepareAuthPassword(newPassword, salts, firstRunToken).then((reply) => {
      const dotYouClient = new OwnerClient({ api: ApiType.Owner });
      return dotYouClient
        .createAxiosClient({ overrideEncryption: true })
        .post('/authentication/passwd', reply)
        .then((response) => {
          return response.status === 200;
        });
    });
  });
};

export const finalizeRegistration = async (firstRunToken: string) => {
  const dotYouClient = new OwnerClient({ api: ApiType.Owner });
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const url = '/config/registration/finalize?frid=' + firstRunToken;

  return await client.get(url).then((response) => {
    return response.data;
  });
};

export const isPasswordSet = async (): Promise<boolean> => {
  const dotYouClient = new OwnerClient({ api: ApiType.Owner });

  return dotYouClient
    .createAxiosClient({ overrideEncryption: true })
    .post('/authentication/ispasswordset')
    .then((response) => {
      return response.data == true;
    });
};

/// Internal helpers
const getNonce = async (): Promise<NonceData> => {
  const dotYouClient = new OwnerClient({ api: ApiType.Owner });
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  return client
    .get('/authentication/nonce')
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

const getSalts = async (): Promise<NonceData> => {
  const dotYouClient = new OwnerClient({ api: ApiType.Owner });
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  return client.get('/authentication/getsalts').then((response) => {
    return response.data;
  });
};
