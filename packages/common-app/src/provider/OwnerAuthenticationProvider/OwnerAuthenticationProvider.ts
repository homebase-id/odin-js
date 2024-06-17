import { ApiType } from '@youfoundation/js-lib/core';
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

  //withCredentials lets us set the cookies return from the /admin/authentication endpoint
  return client.get('/authentication/logout', { withCredentials: true }).then((response) => {
    return response.data;
  });
};

export const logoutOwnerAndAllApps = async (): Promise<void> => {
  await logoutOwner();

  // CAT
  localStorage.removeItem(`BX0900_feed`);
  localStorage.removeItem(`BX0900_mail`);
  localStorage.removeItem(`BX0900_chat`);

  // Shared Secret
  localStorage.removeItem(`APPS_feed`);
  localStorage.removeItem(`APPS_mail`);
  localStorage.removeItem(`APPS_chat`);

  // Caches
  localStorage.removeItem(`OWNER_REACT_QUERY_OFFLINE_CACHE`);
  localStorage.removeItem(`FEED_REACT_QUERY_OFFLINE_CACHE`);
  localStorage.removeItem(`CHAT_REACT_QUERY_OFFLINE_CACHE`);

  // IndexedDB
  indexedDB.deleteDatabase(`keyval-store`);

  window.location.href = '/owner/login';
};
