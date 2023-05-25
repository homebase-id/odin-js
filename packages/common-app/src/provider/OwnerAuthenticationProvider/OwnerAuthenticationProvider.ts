import { ApiType } from '@youfoundation/js-lib';
import { OwnerClient } from '../../core/OwnerClient';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidOwnerToken = async (): Promise<boolean> => {
  const dotYouClient = new OwnerClient({ api: ApiType.Owner });
  //Note: the token is in a cookie marked http-only so making
  // the call to the endpoint will automatically include the
  // cookie.  we just need to check the success code

  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  return client.get('/authentication/verifyToken').then((response) => {
    return response.data;
  });
};

export const logoutOwner = async (): Promise<boolean> => {
  const dotYouClient = new OwnerClient({ api: ApiType.Owner });
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });

  await client.get('/auth/delete-token', { baseURL: '/api/youauth/v1' });

  //withCredentials lets us set the cookies return from the /admin/authentication endpoint
  return client.get('/authentication/logout', { withCredentials: true }).then((response) => {
    return response.data;
  });
};
