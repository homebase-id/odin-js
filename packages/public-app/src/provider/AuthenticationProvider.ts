import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (): Promise<boolean> => {
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

export const logout = async (): Promise<void> => {
  const dotYouClient = new DotYouClient({ api: ApiType.Guest });
  const client = dotYouClient.createAxiosClient();
  await client.get('/builtin/home/auth/delete-token');
};
