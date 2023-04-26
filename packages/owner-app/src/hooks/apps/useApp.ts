import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiType, DotYouClient, ensureDrive } from '@youfoundation/js-lib';
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
  PermissionSetGrantRequest,
  PermissionUpdateRequest,
} from '../../provider/app/AppManagementProviderTypes';
import useAuth from '../auth/useAuth';

const useApp = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetch = async ({ appId }: { appId: string }) => {
    return await GetAppRegistration(dotYouClient, { appId: appId });
  };

  const registerNewApp = async (appRegRequest: AppRegistrationRequest) => {
    await Promise.all(
      appRegRequest.drives?.map(async (driveGrant) => {
        return await ensureDrive(
          dotYouClient,
          driveGrant.permissionedDrive.drive,
          driveGrant.driveMeta?.name,
          driveGrant.driveMeta?.description,
          false
        );
      })
    );

    await RegisterApp(dotYouClient, {
      ...appRegRequest,
      drives: appRegRequest.drives.map((driveGrant) => {
        return { ...driveGrant, driveMeta: undefined };
      }),
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

  const updatePermissions = async ({ appId, permissionSet, drives }: PermissionUpdateRequest) => {
    return await UpdatePermissions(dotYouClient, {
      appId,
      permissionSet,
      drives,
    });
  };

  return {
    fetch: useQuery(['app', appId], () => fetch({ appId }), {
      refetchOnWindowFocus: false,
      retry: false,
      enabled: !!appId,
    }),
    registerNewApp: useMutation(registerNewApp, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['app', param.appId]);
        queryClient.invalidateQueries(['registeredApps']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    revokeApp: useMutation(revokeAppInternal, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['app', param.appId]);
        queryClient.invalidateQueries(['registeredApps']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    allowApp: useMutation(allowAppInternal, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['app', param.appId]);
        queryClient.invalidateQueries(['registeredApps']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    removeApp: useMutation(removeAppInternal, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['app', param.appId]);
        queryClient.invalidateQueries(['registeredApps']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updateAuthorizedCircles: useMutation(updateAuthorizedCircles, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['app', param.appId]);
        queryClient.invalidateQueries(['registeredApps']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updatePermissions: useMutation(updatePermissions, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['app', param.appId]);
        queryClient.invalidateQueries(['registeredApps']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useApp;
