import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { STORAGE_IDENTITY_KEY, HOME_SHARED_SECRET, OWNER_SHARED_SECRET } from '../../hooks';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidPublicToken = async (): Promise<boolean> => {
  const odinClient = new OdinClient({
    hostIdentity: window.location.hostname,
    api: ApiType.Guest,
  });
  const client = odinClient.createAxiosClient();
  const response = await client.get('/builtin/home/auth/is-authenticated', {
    validateStatus: () => true,
  });
  return response.status === 200 && response.data === true;
};

export const getEccPublicKey = async (): Promise<string> => {
  const odinClient = new OdinClient({
    hostIdentity: window.location.hostname,
    api: ApiType.Guest,
  });
  const client = odinClient.createAxiosClient();
  return await client
    .get('/public/keys/offline_ecc', { validateStatus: () => true })
    .then((response) => response.data);
};

export const logoutPublicSession = async (): Promise<void> => {
  try {
    const odinClient = new OdinClient({
      hostIdentity: window.location.hostname,
      api: ApiType.Guest,
    });
    const client = odinClient.createAxiosClient();
    await client.get('/builtin/home/auth/delete-token');
  } catch (ex) {
    console.warn('Failed to logout on the server', ex);
  }
};

export const logoutPublic = async (): Promise<void> => {
  logoutPublicSession();

  // Auth SS states
  window.localStorage.removeItem(STORAGE_IDENTITY_KEY);
  window.localStorage.removeItem(HOME_SHARED_SECRET);
  window.localStorage.removeItem(OWNER_SHARED_SECRET);

  // Caches
  localStorage.removeItem(`OWNER_REACT_QUERY_OFFLINE_CACHE`);
  localStorage.removeItem(`PUBLIC_REACT_QUERY_OFFLINE_CACHE`);
  localStorage.removeItem(`APP_REACT_QUERY_OFFLINE_CACHE`);

  // IndexedDB
  indexedDB.deleteDatabase(`keyval-store`);

  window.location.href = '/';
};
