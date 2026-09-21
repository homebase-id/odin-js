import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DotYouClient, ensureDrive } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { DriveGrant } from '@homebase-id/js-lib/network';
import { getWellKnownDriveOwningAppId } from '../../provider/app/wellKnownDrives';
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
import { invalidateApps } from './useApps';
import { useDotYouClientContext } from '@homebase-id/common-app';

interface PermissionExtensionRequest extends Omit<PermissionUpdateRequest, 'drives'> {
  drives?: (DriveGrantRequest | DriveGrant)[];
}

/**
 * Creates the drives an app asked for that do not exist yet, stamped with that app as their owner.
 *
 * Two questions decide whether a requested drive gets created here, and both have to be yes:
 *
 * 1. **Did the app ask for it to be created?** A grant carrying `driveMeta` with a `name` is the app
 *    describing a drive it wants; a grant without one is asking for access to a drive it expects to
 *    already be there. That is the condition this has always used.
 * 2. **Does the app own it?** A well-known drive belongs to a named app (see `wellKnownDrives`), and
 *    apps routinely request each other's: chat, mail, feed and community all ask for the profile and
 *    contacts drives, and community asks for the chat drive. Creating one of those from here would
 *    record the *requesting* app as its owner, which is wrong and permanent -- a drive's owning app
 *    is what its slug is unique within. So a well-known drive is only ever created by its own app;
 *    for anyone else it is somebody else's drive, and if it is absent the grant is the server's to
 *    refuse rather than ours to paper over. A drive not in that list is one the app invented, and an
 *    app owns what it invents.
 *
 * A drive type slug is required on any drive we do create: the app asking for a drive knows what
 * kind of drive it is, and guessing produces a permanent address nobody chose -- so this throws
 * rather than falling back to "it has the channel type, so call it a channel".
 *
 * The *drive* slug may still be undefined, and only for a runtime instance drive -- one per feed
 * channel or community, created through the extend-permissions flow. There the server derives it
 * from the name, because only the server holds the set of slugs the owning app already uses and so
 * only it can dedupe two channels that share a name. Every other drive names its own.
 */
const ensureAppOwnedDrives = async (
  dotYouClient: DotYouClient,
  appId: string,
  drives: (DriveGrantRequest | DriveGrant)[]
) => {
  await Promise.all(
    drives.map(async (driveGrant) => {
      // A DriveGrant already describes a drive that exists, so it carries no driveMeta and falls
      // straight through here.
      const driveMeta = (driveGrant as DriveGrantRequest).driveMeta;
      if (!driveMeta?.name) return;

      const drive = driveGrant.permissionedDrive.drive;
      const wellKnownOwner = getWellKnownDriveOwningAppId(drive);
      if (wellKnownOwner && !stringGuidsEqual(wellKnownOwner, appId)) return;

      if (!driveMeta.driveTypeSlug)
        throw new Error(
          `Drive "${driveMeta.name}" (${drive.alias}/${drive.type}) is missing its drive type ` +
            `slug (ts); a drive cannot be created without one.`
        );

      return await ensureDrive(
        dotYouClient,
        drive,
        driveMeta.name,
        driveMeta.description,
        driveMeta.allowAnonymousReads || false,
        driveMeta.allowSubscriptions || false,
        // Channel drives are always CDN-enabled
        stringGuidsEqual(drive.type, BlogConfig.DriveType),
        appId,
        driveMeta.driveSlug,
        driveMeta.driveTypeSlug
      );
    })
  );
};

export const useApp = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const fetch = async ({ appId }: { appId: string }) => {
    return (await GetAppRegistration(dotYouClient, { appId: appId })) || null;
  };

  const registerNewApp = async (appRegRequest: AppRegistrationRequest) => {
    if (appRegRequest.drives)
      await ensureAppOwnedDrives(dotYouClient, appRegRequest.appId, appRegRequest.drives);

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
    if (drives) await ensureAppOwnedDrives(dotYouClient, appId, drives);

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
      enabled: !!appId,
    }),
    registerNewApp: useMutation({
      mutationFn: registerNewApp,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    revokeApp: useMutation({
      mutationFn: revokeAppInternal,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    allowApp: useMutation({
      mutationFn: allowAppInternal,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    removeApp: useMutation({
      mutationFn: removeAppInternal,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updateAuthorizedCircles: useMutation({
      mutationFn: updateAuthorizedCircles,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updatePermissions: useMutation({
      mutationFn: updatePermissions,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    extendPermissions: useMutation({
      mutationFn: extendPermissions,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateApps(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export const invalidateApp = (queryClient: QueryClient, appId: string) => {
  queryClient.invalidateQueries({ queryKey: ['app', appId] });
};
