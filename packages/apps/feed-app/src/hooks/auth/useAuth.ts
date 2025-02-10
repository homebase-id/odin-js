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
  TargetDriveAccessRequest,
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
  OWNER_APPS_ROOT,
  useDotYouClient,
} from '@homebase-id/common-app';
import { useQueryClient } from '@tanstack/react-query';

export const useValidateAuthorization = () => {
  const { hasSharedSecret } = useDotYouClient();
  const { data: hasValidToken, isFetched } = useVerifyToken();

  useEffect(() => {
    if (isFetched && hasValidToken !== undefined) {
      if (!hasValidToken && hasSharedSecret) {
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

const StandardProfileDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
export const drives: TargetDriveAccessRequest[] = [
  {
    alias: BlogConfig.FeedDrive.alias,
    type: BlogConfig.FeedDrive.type,
    name: '',
    description: '',
    permissions: [DrivePermissionType.Read + DrivePermissionType.Write],
  },
  {
    // Standard profile Info
    alias: StandardProfileDrive.alias,
    type: StandardProfileDrive.type,
    name: '',
    description: '',
    permissions: [DrivePermissionType.Read],
  },
  {
    // Homepage Drive
    alias: HomePageConfig.HomepageTargetDrive.alias,
    type: HomePageConfig.HomepageTargetDrive.type,
    name: '',
    description: '',
    permissions: [DrivePermissionType.Read],
  },
  {
    // Contact Drive
    alias: ContactConfig.ContactTargetDrive.alias,
    type: ContactConfig.ContactTargetDrive.type,
    name: '',
    description: '',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write],
  },
  {
    // Public posts
    alias: BlogConfig.PublicChannelDrive.alias,
    type: BlogConfig.PublicChannelDrive.type,
    name: '',
    description: '',
    permissions: [
      DrivePermissionType.Read,
      DrivePermissionType.Write,
      DrivePermissionType.React,
      DrivePermissionType.Comment,
    ],
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
      FEED_ROOT_PATH.startsWith(OWNER_APPS_ROOT) ? undefined : window.location.host,
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
