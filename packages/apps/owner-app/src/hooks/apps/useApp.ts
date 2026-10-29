import { useRef, useState } from 'react';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateDriveRemoval } from '../drives/useDrive';
import {
  DotYouClient,
  editDriveAllowSubscriptions,
  editDriveAttributes,
  ensureDrive,
  getDrives,
  getRequestedDriveChanges,
  isZeroKnowledgeSharingModel,
} from '@homebase-id/js-lib/core';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { DriveGrant } from '@homebase-id/js-lib/network';
import { getWellKnownDriveOwningAppId } from '../../provider/app/wellKnownDrives';
import {
  AllowApp,
  GetAppRegistration,
  RegisterApp,
  UninstallApp,
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
import {
  ActionButtonState,
  invalidateCircles,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import {
  backfillAppKeys,
  getZkMasterKey,
  openZkMasterKeyWithPassword,
} from '../../provider/auth/ZeroKnowledgeProvider';

interface PermissionExtensionRequest extends Omit<PermissionUpdateRequest, 'drives'> {
  drives?: (DriveGrantRequest | DriveGrant)[];
}

/**
 * The password field of a page that may create private drives: shown once a request needed the password
 * (ZkPasswordNeededError), and kept, so a wrong password shows its error and the owner types it again.
 */
export const useZkPasswordPrompt = () => {
  const [needsPassword, setNeedsPassword] = useState(false);
  return {
    needsPassword,
    /** Call with a request's error: the one asking for the password shows the field. */
    onError: (error: unknown) => {
      if (error instanceof ZkPasswordNeededError) setNeedsPassword(true);
    },
    /** The error to show: not the one asking for the password, which the field answers. */
    shownError: (error: unknown) => (error instanceof ZkPasswordNeededError ? undefined : error),
    /** While the field is shown, a failed attempt leaves the button ready for the next. */
    buttonState: (state: ActionButtonState): ActionButtonState =>
      needsPassword && state === 'error' ? 'idle' : state,
  };
};

/**
 * A drive the app asked for private or Selective Share is new, and this session holds no zero-knowledge master key:
 * the page asks for the password and tries again with it.
 */
export class ZkPasswordNeededError extends Error {
  constructor() {
    super(t('Enter your password to create the private drives this app asked for'));
  }
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
 * channel or community, created through the extend-permissions flow. There `ensureDrive` derives it
 * from the name, unique against the slugs the owning app's drives already hold; the server requires
 * a stated slug and derives nothing. Every other drive names its own.
 *
 * A drive asked for private or Selective Share (`sharingModel`) is created zero knowledge, never created and then
 * converted (odin-core docs/zero-knowledge-drive-api-plan.md, step 4): its keys are made here, locked with the
 * zero-knowledge master key, from this session or opened with `password`. Without either it throws
 * ZkPasswordNeededError. Returns that key when a zero-knowledge drive was created, so the app's copy of its key can
 * be locked once the app is granted it.
 */
const ensureAppOwnedDrives = async (
  dotYouClient: DotYouClient,
  appId: string,
  drives?: (DriveGrantRequest | DriveGrant)[] | null,
  password?: string
): Promise<Uint8Array | undefined> => {
  if (!drives) return undefined;

  // Asked for only when a zero-knowledge drive is actually created, and once for all of them
  let zkMasterKey: Promise<Uint8Array> | undefined;
  const getMasterKey = () =>
    (zkMasterKey ??= (async () => {
      const key = await getZkMasterKey(dotYouClient);
      if (key) return key;
      if (!password) throw new ZkPasswordNeededError();
      return await openZkMasterKeyWithPassword(dotYouClient, password);
    })());

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
        driveMeta.driveTypeSlug,
        driveMeta.attributes,
        isZeroKnowledgeSharingModel(driveMeta.sharingModel)
          ? { sharingModel: driveMeta.sharingModel, getZkMasterKey: getMasterKey }
          : undefined
      );
    })
  );

  return zkMasterKey && (await zkMasterKey);
};

/**
 * The app's copy of each zero-knowledge drive it is granted and lacks one of: a drive just created for it, and one
 * that already existed, such as Filesync's drive when Chat is granted it. Done with the key this page opened, or the
 * session's; without either, the app's next sign-in or the owner's next login fills it in.
 */
const lockGrantedDrivesForApp = async (
  dotYouClient: DotYouClient,
  appId: string,
  openedZkMasterKey: Uint8Array | undefined
) => {
  const zkMasterKey = openedZkMasterKey ?? (await getZkMasterKey(dotYouClient));
  if (!zkMasterKey) return;
  await backfillAppKeys(dotYouClient, zkMasterKey, appId).catch((error) =>
    console.warn(
      "The app's copy of its private drives' keys could not be saved; its next sign-in does",
      error
    )
  );
};

/**
 * Applies what each grant asks for to its drive when the drive already exists: turns on
 * subscriptions and merges in the requested attributes (see `getRequestedDriveChanges`). A drive
 * created by `ensureAppOwnedDrives` already has them, so it is left alone.
 *
 * `ownedByAppId` limits this to the drives that app owns. Install passes it, because there the owner
 * approves an app rather than drive settings; the pages where an app asks for drive settings show
 * each change and leave it out.
 */
export const applyRequestedDriveChanges = async (
  dotYouClient: DotYouClient,
  drives: (DriveGrantRequest | DriveGrant)[],
  ownedByAppId?: string
) => {
  const existingDrives = (await getDrives(dotYouClient, { pageNumber: 1, pageSize: 1000 })).results;

  await Promise.all(
    drives.map(async (driveGrant) => {
      const targetDrive = driveGrant.permissionedDrive.drive;
      const drive = existingDrives.find((d) => drivesEqual(d.targetDriveInfo, targetDrive));
      if (!drive) return;
      if (ownedByAppId && !stringGuidsEqual(drive.appId ?? undefined, ownedByAppId)) return;

      const changes = getRequestedDriveChanges(drive, (driveGrant as DriveGrantRequest).driveMeta);
      if (changes.attributes)
        await editDriveAttributes(dotYouClient, targetDrive, changes.attributes);
      if (changes.allowSubscriptions)
        await editDriveAllowSubscriptions(dotYouClient, targetDrive, true);
    })
  );
};

export const useApp = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();
  // The owner's password, when creating a private drive needs it (ZkPasswordNeededError). Read by the mutations rather
  // than passed to them, so react-query's mutation cache never holds it.
  const zkPassword = useRef<string>();

  const fetch = async ({ appId }: { appId: string }) => {
    return (await GetAppRegistration(dotYouClient, { appId: appId })) || null;
  };

  const registerNewApp = async (appRegRequest: AppRegistrationRequest) => {
    const zkMasterKey = await ensureAppOwnedDrives(
      dotYouClient,
      appRegRequest.appId,
      appRegRequest.drives,
      zkPassword.current
    );

    await RegisterApp(dotYouClient, { ...appRegRequest, drives: appRegRequest.drives ?? [] });
    await lockGrantedDrivesForApp(dotYouClient, appRegRequest.appId, zkMasterKey);

    if (appRegRequest.drives)
      await applyRequestedDriveChanges(dotYouClient, appRegRequest.drives, appRegRequest.appId);
  };

  const revokeAppInternal = async ({ appId }: { appId: string }) => {
    return await RevokeApp(dotYouClient, { appId: appId });
  };

  const allowAppInternal = async ({ appId }: { appId: string }) => {
    return await AllowApp(dotYouClient, { appId: appId });
  };

  const uninstallAppInternal = async ({
    appId,
    deleteOwnedCirclesAndDrives,
  }: {
    appId: string;
    deleteOwnedCirclesAndDrives: boolean;
  }) => {
    return await UninstallApp(dotYouClient, { appId, deleteOwnedCirclesAndDrives });
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
    const zkMasterKey = await ensureAppOwnedDrives(dotYouClient, appId, drives, zkPassword.current);

    const updated = await UpdatePermissions(dotYouClient, {
      appId,
      permissionSet,
      drives: drives || [],
    });
    await lockGrantedDrivesForApp(dotYouClient, appId, zkMasterKey);
    return updated;
  };

  const applyDriveChanges = async (drives: DriveGrantRequest[]) =>
    await applyRequestedDriveChanges(dotYouClient, drives);

  const updatePermissions = async ({ appId, permissionSet, drives }: PermissionUpdateRequest) => {
    const updated = await UpdatePermissions(dotYouClient, {
      appId,
      permissionSet,
      drives,
    });
    // A private drive granted from the console's own editors: the app's copy of its key
    await lockGrantedDrivesForApp(dotYouClient, appId, undefined);
    return updated;
  };

  return {
    setZkPassword: (password: string | undefined) => (zkPassword.current = password),
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
        // Declared circles were created with the app.
        if (param.circles?.length) invalidateCircles(queryClient);
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
    // Its circles and drives may go with it, and other apps lose those circles from their grants.
    uninstallApp: useMutation({
      mutationFn: uninstallAppInternal,
      onSuccess: (data, param) => {
        invalidateApp(queryClient, param.appId);
        invalidateDriveRemoval(queryClient);
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
    applyDriveChanges: useMutation({
      mutationFn: applyDriveChanges,
      onSettled: () => queryClient.invalidateQueries({ queryKey: ['drives'] }),
    }),
  };
};

export const invalidateApp = (queryClient: QueryClient, appId: string) => {
  queryClient.invalidateQueries({ queryKey: ['app', appId] });
};
