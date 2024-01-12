import { ApiType, DotYouClient, DrivePermissionType } from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVerifyToken } from './useVerifyToken';
import {
  logout as logoutYouauth,
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  getRegistrationParams,
  preAuth as preauthApps,
  retrieveIdentity,
  saveIdentity,
  createEccPair,
  YouAuthorizationParams,
  saveEccKey,
  retrieveEccKey,
  throwAwayTheECCKey,
} from '@youfoundation/js-lib/auth';
import { ROOT_PATH } from '../../app/App';
import { AppPermissionType, ContactConfig } from '@youfoundation/js-lib/network';
import { BlogConfig, HomePageConfig } from '@youfoundation/js-lib/public';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { APP_AUTH_TOKEN, APP_SHARED_SECRET } from '@youfoundation/common-app';

const StandardProfileDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
export const drives = [
  {
    a: BlogConfig.FeedDrive.alias,
    t: BlogConfig.FeedDrive.type,
    n: '',
    d: '',
    p: DrivePermissionType.Read + DrivePermissionType.Write,
  },
  {
    // Standard profile Info
    a: StandardProfileDrive.alias,
    t: StandardProfileDrive.type,
    n: '',
    d: '',
    p: DrivePermissionType.Read,
  },
  {
    // Homepage Drive
    a: HomePageConfig.HomepageTargetDrive.alias,
    t: HomePageConfig.HomepageTargetDrive.type,
    n: '',
    d: '',
    p: DrivePermissionType.Read,
  },
  {
    // Contact Drive
    a: ContactConfig.ContactTargetDrive.alias,
    t: ContactConfig.ContactTargetDrive.type,
    n: '',
    d: '',
    p: DrivePermissionType.Read,
  },
  {
    // Public posts

    a: BlogConfig.PublicChannelDrive.alias,
    t: BlogConfig.PublicChannelDrive.type,
    n: '',
    d: '',
    p:
      DrivePermissionType.Read +
      DrivePermissionType.Write +
      DrivePermissionType.React +
      DrivePermissionType.Comment,
  },
];
export const appName = 'Homebase - Feed';
export const appId = '5f887d80-0132-4294-ba40-bda79155551d';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

export const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const navigate = useNavigate();

  const logout = async (): Promise<void> => {
    await logoutYouauth(getDotYouClient());

    localStorage.removeItem(APP_SHARED_SECRET);
    localStorage.removeItem(APP_AUTH_TOKEN);
    setAuthenticationState('anonymous');

    navigate('/');
    window.location.reload();
  };

  const preauth = async (): Promise<void> => {
    await preauthApps(getDotYouClient());
  };

  const getAppAuthToken = () => window.localStorage.getItem(APP_AUTH_TOKEN);

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) return base64ToUint8Array(raw);
  };

  const getDotYouClient = () => {
    const headers: Record<string, string> = {};
    const authToken = getAppAuthToken();
    if (authToken) {
      headers['bx0900'] = authToken;
    }

    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: ApiType.App,
      identity: retrieveIdentity(),
      headers: headers,
    });
  };

  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(getDotYouClient());

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');
        if (window.localStorage.getItem(APP_SHARED_SECRET)) {
          console.log('Token is invalid, logging out..');
          // Auth state was presumed logged in, but not allowed.. Will attempt reload page?
          //  (Browsers may ignore, as it's not a reload on user request)
          logout();
        }
      }
    }
  }, [hasValidToken]);

  return {
    logout,
    preauth,
    getDotYouClient,
    getSharedSecret,
    getIdentity: retrieveIdentity,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export const useYouAuthAuthorization = () => {
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      [
        AppPermissionType.ReadConnections,
        AppPermissionType.ManageConnectionRequests,
        AppPermissionType.ReadCircleMembers,
        AppPermissionType.ReadWhoIFollow,
        AppPermissionType.ReadMyFollowers,
        AppPermissionType.ManageFeed,
        AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
        AppPermissionType.ReceiveDataFromOtherIdentitiesOnMyBehalf,
        AppPermissionType.PublishStaticContent,
        AppPermissionType.SendPushNotifications,
      ],
      undefined,
      drives,
      undefined,
      eccKey.publicKey,
      window.location.host,
      undefined,
      returnUrl
    );
  };

  const finalizeAuthorization = async (identity: string, publicKey: string, salt: string) => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');

      const { clientAuthToken, sharedSecret } = await finalizeAuthenticationYouAuth(
        identity,
        privateKey,
        publicKey,
        salt
      );

      if (identity) saveIdentity(identity);
      localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
      localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);

      throwAwayTheECCKey();
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};
