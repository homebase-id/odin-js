import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { OwnerClient } from '../../core/OwnerClient';
import { logout } from '@homebase-id/js-lib/auth';
import { APP_KEYS } from '../../constants';
import { base64ToUint8Array } from '@homebase-id/js-lib/helpers';
import { HOME_SHARED_SECRET, OWNER_SHARED_SECRET, STORAGE_IDENTITY_KEY } from '../../hooks';
import { del } from 'idb-keyval';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidOwnerToken = async (): Promise<boolean> => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });
  //Note: the token is in a cookie marked http-only so making
  // the call to the endpoint will automatically include the
  // cookie.  we just need to check the success code

  const client = odinClient.createAxiosClient({ overrideEncryption: true });
  return client.get('/authentication/verifyToken').then((response) => {
    return response.data;
  });
};

const logoutOwner = async (): Promise<boolean> => {
  const odinClient = new OwnerClient({
    api: ApiType.Owner,
  });
  const client = odinClient.createAxiosClient({ overrideEncryption: true });

  //withCredentials lets us set the cookies return from the /admin/authentication endpoint
  return client.get('/authentication/logout', { withCredentials: true }).then((response) => {
    return response.data;
  });
};

export const logoutOwnerAndAllApps = async (): Promise<void> => {
  try {
    // Unsubscribe from notifications
    const odinClient = new OwnerClient({
      api: ApiType.Owner,
    });
    await removeCurrentRegisteredDevice(odinClient);
  } catch (ex) {
    console.warn('Failed unregister push notifiations', ex);
  }

  try {
    await Promise.all(
      APP_KEYS.map(async (key) => {
        const authToken = localStorage.getItem(`BX0900_${key}`);
        if (!authToken) return;
        const rawApps = localStorage.getItem(`APPS_${key}`);
        if (!rawApps) return;

        const headers: Record<string, string> = {
          bx0900: authToken,
        };

        const apss = base64ToUint8Array(rawApps);
        const odinClient = new OdinClient({
          api: ApiType.App,
          sharedSecret: apss,
          hostIdentity: window.location ? window.location.host : '',
          headers,
        });

        // Remove app sessions from server
        await logout(odinClient);
      })
    );

    APP_KEYS.forEach((key) => {
      localStorage.removeItem(`BX0900_${key}`);
      localStorage.removeItem(`APPS_${key}`);
    });
  } catch (ex) {
    console.warn('Failed to logout on the server', ex);
  }

  try {
    // Remove session from server
    await logoutOwner();
  } catch (ex) {
    console.warn('Failed to logout on the server', ex);
  }

  // Auth SS states
  window.localStorage.removeItem(STORAGE_IDENTITY_KEY);
  window.localStorage.removeItem(HOME_SHARED_SECRET);
  window.localStorage.removeItem(OWNER_SHARED_SECRET);

  // Caches
  localStorage.removeItem(`OWNER_REACT_QUERY_OFFLINE_CACHE`);
  localStorage.removeItem(`PUBLIC_REACT_QUERY_OFFLINE_CACHE`);
  localStorage.removeItem(`APP_REACT_QUERY_OFFLINE_CACHE`);

  // IndexedDB
  // indexedDB.deleteDatabase(`keyval-store`);
  del(`OWNER_REACT_QUERY_OFFLINE_CACHE`);
  del(`PUBLIC_REACT_QUERY_OFFLINE_CACHE`);
  del(`APP_REACT_QUERY_OFFLINE_CACHE`);

  window.location.href = '/owner/login';
};

const removeCurrentRegisteredDevice = async (odinClient: OdinClient) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient.post(`/notify/push/unsubscribe/`);
};
