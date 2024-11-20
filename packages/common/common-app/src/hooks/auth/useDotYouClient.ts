import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import { base64ToUint8Array, isLocalStorageAvailable } from '@homebase-id/js-lib/helpers';
import { OwnerClient } from '../../core';
import { retrieveIdentity } from '@homebase-id/js-lib/auth';
import { OWNER_APPS_ROOT, OWNER_ROOT } from '../../constants';

export const HOME_SHARED_SECRET = 'HSS';
export const OWNER_SHARED_SECRET = 'SS';
export const STORAGE_IDENTITY_KEY = 'identity';

export const APP_AUTH_TOKEN = window.location.pathname.startsWith(OWNER_APPS_ROOT)
  ? `BX0900_${window.location.pathname.split('/')?.[2]}`
  : 'BX0900';

export const APP_SHARED_SECRET = window.location.pathname.startsWith(OWNER_APPS_ROOT)
  ? `APPS_${window.location.pathname.split('/')?.[2]}`
  : 'APSS';

export const useDotYouClient = () => {
  const _app = window.location.pathname.startsWith(OWNER_ROOT)
    ? 'owner'
    : window.location.hostname === 'dev.dotyou.cloud' ||
        window.location.hostname === 'feed.homebase.id' ||
        window.location.pathname.startsWith(OWNER_APPS_ROOT)
      ? 'apps'
      : 'home';

  const _isOwner =
    _app === 'owner' ||
    (isLocalStorageAvailable() &&
      localStorage.getItem(STORAGE_IDENTITY_KEY) === window.location.host) ||
    (isLocalStorageAvailable() && !!localStorage.getItem(OWNER_SHARED_SECRET));

  const getApiType = () => {
    if (_app === 'apps') return ApiType.App;
    if (_isOwner) return ApiType.Owner;
    return ApiType.Guest;
  };

  const getRawSharedSecret = () =>
    isLocalStorageAvailable()
      ? _app !== 'apps'
        ? _isOwner
          ? window.localStorage.getItem(OWNER_SHARED_SECRET)
          : window.localStorage.getItem(HOME_SHARED_SECRET)
        : window.localStorage.getItem(APP_SHARED_SECRET)
      : undefined;

  const hasSharedSecret = !!getRawSharedSecret();
  const getSharedSecret = () => {
    const raw = getRawSharedSecret();
    if (raw) return base64ToUint8Array(raw);
  };

  // Get the logged in user's identity
  const getIdentity = () => {
    return _app === 'owner' || (_app === 'home' && _isOwner)
      ? window.location.hostname
      : localStorage.getItem(STORAGE_IDENTITY_KEY) || undefined;
  };

  const getDotYouClient = () => {
    // When running in an iframe, use the public YouAuth Api;
    if (window.self !== window.top) return new DotYouClient({ api: ApiType.Guest });

    const apiType = getApiType();

    if (apiType === ApiType.Owner)
      return new OwnerClient({ api: apiType, sharedSecret: getSharedSecret() });
    else if (apiType === ApiType.Guest)
      return new DotYouClient({
        api: apiType,
        sharedSecret: getSharedSecret(),
      });
    else {
      const headers: Record<string, string> = {};
      const authToken = window.localStorage.getItem(APP_AUTH_TOKEN);
      if (authToken) {
        headers['bx0900'] = authToken;
      }

      return new DotYouClient({
        sharedSecret: getSharedSecret(),
        api: ApiType.App,
        hostIdentity: retrieveIdentity(),
        loggedInIdentity: getIdentity(),
        headers: headers,
      });
    }
  };

  return {
    hasSharedSecret,
    getSharedSecret,
    getDotYouClient,
    isOwner: _isOwner,
  };
};
