import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ensureDrive } from '@homebase-id/js-lib/core';
import { DriveGrant } from '@homebase-id/js-lib/network';
import {
  AllowApp,
  GetAppRegistration,
  RegisterApp,
  RemoveApp,
  RevokeApp,
  UpdateAuthorizedCircles,
  UpdatePermissions,
} from '../../provider/app/AppManagementProvider';
import {
  AppRegistrationRequest,
  DriveGrantRequest,
  PermissionSetGrantRequest,
  PermissionUpdateRequest,
} from '../../provider/app/AppManagementProviderTypes';
import { useAuth } from '../auth/useAuth';

interface PermissionExtensionRequest extends Omit<PermissionUpdateRequest, 'drives'> {
  drives?: (DriveGrantRequest | DriveGrant)[];
}

export const useApp = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const fetch = async ({ appId }: { appId: string }) => {
    return (await GetAppRegistration(dotYouClient, { appId: appId })) || null;
  };

  const registerNewApp = async (appRegRequest: AppRegistrationRequest) => {
    if (appRegRequest.drives)
      await Promise.all(
        appRegRequest.drives.map(async (driveGrant) => {
          if (driveGrant.driveMeta && driveGrant.driveMeta.name)
            return await ensureDrive(
              dotYouClient,
              driveGrant.permissionedDrive.drive,
              driveGrant.driveMeta.name,
              driveGrant.driveMeta.description,
              driveGrant.driveMeta.allowAnonymousReads || false,
              driveGrant.driveMeta.allowSubscriptions || false
            );
        })
      );

    await RegisterApp(dotYouClient, {
      ...appRegRequest,
      drives: appRegRequest.drives
        ? appRegRequest.drives.map((driveGrant) => {
            return { ...driveGrant, driveMeta: undefined };
          })
        : [],
    });
  };

  const revokeAppInternal = async ({ appId }: { appId: string }) => {
    return await RevokeApp(dotYouClient, { appId: appId });
  };

  const allowAppInternal = async ({ appId }: { appId: string }) => {
    return await AllowApp(dotYouClient, { appId: appId });
  };

  const removeAppInternal = async ({ appId }: { appId: string }) => {
    return await RemoveApp(dotYouClient, { appId: appId });
  };

  const updateAuthorizedCircles = async ({
    appId,
    circleIds,
    circleMemberPermissionGrant,
  }: {
    appId: string;
    circleIds: string[];
    circleMemberPermissionGrant: PermissionSetGrantRequest;
  }) => {
    return await UpdateAuthorizedCircles(dotYouClient, {
      appId,
      authorizedCircles: circleIds,
      circleMemberPermissionGrant,
    });
  };

  const extendPermissions = async ({
    appId,
    permissionSet,
    drives,
  }: PermissionExtensionRequest) => {
    if (drives)
      await Promise.all(
        drives.map(async (driveGrant: DriveGrantRequest) => {
          if (driveGrant.driveMeta && driveGrant.driveMeta.name)
            return await ensureDrive(
              dotYouClient,
              driveGrant.permissionedDrive.drive,
              driveGrant.driveMeta.name,
              driveGrant.driveMeta.description,
              driveGrant.driveMeta.allowAnonymousReads || false,
              driveGrant.driveMeta.allowSubscriptions || false
            );
        })
      );

    return await UpdatePermissions(dotYouClient, {
      appId,
      permissionSet,
      drives: drives || [],
    });
  };

  const updatePermissions = async ({ appId, permissionSet, drives }: PermissionUpdateRequest) => {
    return await UpdatePermissions(dotYouClient, {
      appId,
      permissionSet,
      drives,
    });
  };

  return {
    fetch: useQuery({
      queryKey: ['app', appId],
      queryFn: () => fetch({ appId: appId as string }),
      refetchOnWindowFocus: false,
      retry: false,
      enabled: !!appId,
    }),
    registerNewApp: useMutation({
      mutationFn: registerNewApp,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    revokeApp: useMutation({
      mutationFn: revokeAppInternal,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    allowApp: useMutation({
      mutationFn: allowAppInternal,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    removeApp: useMutation({
      mutationFn: removeAppInternal,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updateAuthorizedCircles: useMutation({
      mutationFn: updateAuthorizedCircles,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updatePermissions: useMutation({
      mutationFn: updatePermissions,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    extendPermissions: useMutation({
      mutationFn: extendPermissions,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['app', param.appId] });
        queryClient.invalidateQueries({ queryKey: ['registeredApps'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
