import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { OwnerClient } from '../../core';
import { APP_AUTH_TOKEN, APP_SHARED_SECRET, retrieveIdentity } from '@youfoundation/js-lib/auth';

export const HOME_SHARED_SECRET = 'HSS';
export const OWNER_SHARED_SECRET = 'SS';
export const STORAGE_IDENTITY_KEY = 'identity';

export const useDotYouClient = () => {
  const _app = window.location.pathname.startsWith('/owner')
    ? 'owner'
    : window.location.pathname.startsWith('/home')
    ? 'home'
    : 'apps';

  const _isOwner =
    _app === 'owner' ||
    localStorage.getItem(STORAGE_IDENTITY_KEY) === window.location.host ||
    !!localStorage.getItem(OWNER_SHARED_SECRET);

  const getApiType = () => {
    if (_app === 'apps') return ApiType.App;

    if (_isOwner) return ApiType.Owner;
    return ApiType.YouAuth;
  };

  const getRawSharedSecret = () =>
    _app !== 'apps'
      ? _isOwner
        ? window.localStorage.getItem(OWNER_SHARED_SECRET)
        : window.localStorage.getItem(HOME_SHARED_SECRET)
      : window.localStorage.getItem(APP_SHARED_SECRET);

  const hasSharedSecret = !!getRawSharedSecret();

  const getSharedSecret = () => {
    const raw = getRawSharedSecret();
    if (raw) return base64ToUint8Array(raw);
  };

  const getIdentity = () => {
    return _app === 'owner' ? window.location.host : localStorage.getItem(STORAGE_IDENTITY_KEY);
  };

  const getDotYouClient = () => {
    const apiType = getApiType();

    if (apiType === ApiType.Owner)
      return new OwnerClient({ api: apiType, sharedSecret: getSharedSecret() });
    else if (apiType === ApiType.YouAuth)
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
        identity: retrieveIdentity(),
        headers: headers,
      });
    }
  };

  return {
    getApiType,
    hasSharedSecret,
    getSharedSecret,
    getDotYouClient,
    isOwner: _isOwner,
    getIdentity,
  };
};
