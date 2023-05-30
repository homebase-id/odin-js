import { ApiType, DotYouClient, base64ToUint8Array } from '@youfoundation/js-lib';
import { OwnerClient } from '../../core';

export const HOME_SHARED_SECRET = 'HSS';

export const OWNER_SHARED_SECRET = 'SS';
export const STORAGE_IDENTITY_KEY = 'identity';

export const useDotYouClient = () => {
  const _app = window.location.pathname.startsWith('/owner') ? 'owner' : 'home';
  const _isOwner =
    _app === 'owner' || localStorage.getItem(STORAGE_IDENTITY_KEY) === window.location.host;

  const getApiType = () => {
    if (_isOwner) return ApiType.Owner;
    return ApiType.YouAuth;
  };

  const getRawSharedSecret = () =>
    _isOwner
      ? window.localStorage.getItem(OWNER_SHARED_SECRET)
      : window.localStorage.getItem(HOME_SHARED_SECRET);

  const hasSharedSecret = !!getRawSharedSecret();

  const getSharedSecret = () => {
    const raw = getRawSharedSecret();
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getIdentity = () => {
    return _app === 'owner' ? window.location.host : localStorage.getItem(STORAGE_IDENTITY_KEY);
  };

  const getDotYouClient = () => {
    const apiType = getApiType();

    if (apiType === ApiType.Owner)
      return new OwnerClient({ api: apiType, sharedSecret: getSharedSecret() });
    else
      return new DotYouClient({
        api: apiType,
        sharedSecret: getSharedSecret(),
      });
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
