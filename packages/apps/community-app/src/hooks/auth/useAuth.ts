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
import { AppPermissionType, ContactConfig } from '@homebase-id/js-lib/network';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  COMMUNITY_APP_ID,
  COMMUNITY_ROOT_PATH,
  logoutOwnerAndAllApps,
  OWNER_APPS_ROOT,
  useOdinClient,
} from '@homebase-id/common-app';
import { LOCAL_COMMUNITY_APP_DRIVE } from '../../providers/CommunityMetadataProvider';
import { useQueryClient } from '@tanstack/react-query';
import { ChatDrive } from '@homebase-id/chat-app/src/providers/ConversationProvider';

export const useValidateAuthorization = () => {
  const { hasSharedSecret } = useOdinClient();
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
  const { getOdinClient } = useOdinClient();
  const preauth = async (): Promise<void> => await preauthApps(getOdinClient());

  return {
    preauth,
  };
};

export const drives: TargetDriveAccessRequest[] = [
  {
    // Standard profile Info
    alias: '8f12d8c4933813d378488d91ed23b64c',
    type: '597241530e3ef24b28b9a75ec3a5c45c',
    name: 'Standard Profile info',
    description: '',
    permissions: [DrivePermissionType.Read],
  },
  {
    // Contacts
    alias: ContactConfig.ContactTargetDrive.alias,
    type: ContactConfig.ContactTargetDrive.type,
    name: 'Contact Drive',
    description: '',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write],
  },
  {
    // Chat Drive
    alias: ChatDrive.alias,
    type: ChatDrive.type,
    name: 'Chat Drive',
    description: '',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write, DrivePermissionType.React],
  },
  {
    alias: LOCAL_COMMUNITY_APP_DRIVE.alias,
    type: LOCAL_COMMUNITY_APP_DRIVE.type,
    name: 'Community Drive',
    description: '',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write],
  },
];

export const permissions = [
  AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReceiveDataFromOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReadConnectionRequests,
  AppPermissionType.ReadConnections,
  AppPermissionType.SendPushNotifications,
  AppPermissionType.ReadCircleMembers,
];

export const appName = 'Homebase - Community';
export const appId = COMMUNITY_APP_ID;

export const useYouAuthAuthorization = () => {
  const queryClient = useQueryClient();
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${COMMUNITY_ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      permissions,
      undefined,
      drives,
      undefined,
      undefined,
      eccKey.publicKey,
      COMMUNITY_ROOT_PATH.startsWith(OWNER_APPS_ROOT) ? undefined : window.location.host,
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
