import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { useEffect } from 'react';
import { invalidateVerifyToken, useVerifyToken } from './useVerifyToken';
import {
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  getRegistrationParams,
  preAuth as preauthApps,
  saveIdentity,
  createEccPair,
  YouAuthorizationParams,
  saveEccKey,
  retrieveEccKey,
  throwAwayTheECCKey,
} from '@homebase-id/js-lib/auth';
import {
  AppPermissionType,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  ContactConfig,
} from '@homebase-id/js-lib/network';
import { BlogConfig, HomePageConfig } from '@homebase-id/js-lib/public';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  FEED_ROOT_PATH,
  logoutOwnerAndAllApps,
  useDotYouClient,
} from '@homebase-id/common-app';
import { useQueryClient } from '@tanstack/react-query';

export const useValidateAuthorization = () => {
  const { getDotYouClient, hasSharedSecret } = useDotYouClient();
  const {
    data: hasValidToken,
    isFetchedAfterMount,
    isRefetching,
    refetch,
  } = useVerifyToken(getDotYouClient());

  useEffect(() => {
    // We got a shared secret; We should reset the token verification
    if (hasSharedSecret && !hasValidToken) refetch();
  }, [hasSharedSecret]);

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      if (!hasValidToken && !isRefetching && hasSharedSecret) {
        console.warn('Token is invalid, logging out..');
        logoutOwnerAndAllApps();
      }
    }
  }, [hasValidToken, hasSharedSecret]);
};

export const useAuth = () => {
  const { getDotYouClient } = useDotYouClient();
  const preauth = async (): Promise<void> => await preauthApps(getDotYouClient());

  return {
    preauth,
  };
};

export const websocketDrives = [BlogConfig.FeedDrive];

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

export const permissions = [
  AppPermissionType.ReadConnections,
  AppPermissionType.ReadConnectionRequests,
  AppPermissionType.ReadCircleMembers,
  AppPermissionType.ReadWhoIFollow,
  AppPermissionType.ReadMyFollowers,
  AppPermissionType.ManageFeed,
  AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReceiveDataFromOtherIdentitiesOnMyBehalf,
  AppPermissionType.PublishStaticContent,
  AppPermissionType.SendPushNotifications,
];

export const appName = 'Homebase - Feed';
export const appId = '5f887d80-0132-4294-ba40-bda79155551d';

export const useYouAuthAuthorization = () => {
  const queryClient = useQueryClient();
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${FEED_ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      permissions,
      undefined,
      drives,
      undefined,
      [CONFIRMED_CONNECTIONS_CIRCLE_ID],
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
      invalidateVerifyToken(queryClient);

      throwAwayTheECCKey();
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};
