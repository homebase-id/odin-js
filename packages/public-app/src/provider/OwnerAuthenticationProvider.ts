import { ApiType, DotYouClient } from '@youfoundation/js-lib';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (): Promise<boolean> => {
  const dotYouClient = new DotYouClient({ api: ApiType.Owner });
  //Note: the token is in a cookie marked http-only so making
  // the call to the endpoint will automatically include the
  // cookie.  we just need to check the success code

  const client = dotYouClient.createAxiosClient(true);
  return client.get('/authentication/verifyToken').then((response) => {
    return response.data;
  });
};

export const logout = async (): Promise<boolean> => {
  const dotYouClient = new DotYouClient({ api: ApiType.Owner });
  const client = dotYouClient.createAxiosClient(true);

  //withCredentials lets us set the cookies return from the /admin/authentication endpoint
  return client.get('/authentication/logout', { withCredentials: true }).then((response) => {
    return response.data;
  });
};
