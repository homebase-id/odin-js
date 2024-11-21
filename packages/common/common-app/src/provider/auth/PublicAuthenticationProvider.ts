import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidPublicToken = async (): Promise<boolean> => {
  const dotYouClient = new DotYouClient({ api: ApiType.Guest });
  const client = dotYouClient.createAxiosClient();
  const response = await client.get('/builtin/home/auth/is-authenticated', {
    validateStatus: () => true,
  });
  return response.status === 200 && response.data === true;
};

export const getEccPublicKey = async (): Promise<string> => {
  const dotYouClient = new DotYouClient({ api: ApiType.Guest });
  const client = dotYouClient.createAxiosClient();
  return await client
    .get('/public/keys/offline_ecc', { validateStatus: () => true })
    .then((response) => response.data);
};

export const logoutPublicSession = async (): Promise<void> => {
  try {
    const dotYouClient = new DotYouClient({ api: ApiType.Guest });
    const client = dotYouClient.createAxiosClient();
    await client.get('/builtin/home/auth/delete-token');
  } catch (ex) {
    console.warn('Failed to logout on the server', ex);
  }
};

export const logoutPublic = async (): Promise<void> => {
  logoutPublicSession();

  // Auth SS states
  window.localStorage.removeItem('identity');
  window.localStorage.removeItem('HSS');
  window.localStorage.removeItem('SS');

  window.location.href = '/';
};
