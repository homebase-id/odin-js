import { DriveDefinition, TargetDrive } from '@homebase-id/js-lib/core';
import { drivesEqual } from '@homebase-id/js-lib/helpers';
import { isOwnerConsoleApp } from './ownerPaths';

export interface DriveAdoption {
  drive: DriveDefinition;
  driveSlug: string;
  driveTypeSlug: string;
}

/**
 * The requested drives an app's consent can also hand to that app: ones that exist, belong to no app
 * (the owner console), are not system drives, and that the request names a full address for.
 *
 * A drive another app owns is left alone: moving it breaks its address for everyone holding it, which
 * is the manual Reassign's to decide, not a consent screen's.
 */
export const getDriveAdoptions = (
  appId: string | null | undefined,
  requests: {
    permissionedDrive: { drive: TargetDrive };
    driveMeta?: { driveSlug?: string; driveTypeSlug?: string };
  }[],
  existingDrives: DriveDefinition[] | undefined
): DriveAdoption[] => {
  if (isOwnerConsoleApp(appId)) return [];

  return requests.flatMap(({ permissionedDrive, driveMeta }) => {
    const drive = existingDrives?.find((d) =>
      drivesEqual(d.targetDriveInfo, permissionedDrive.drive)
    );
    if (!drive || drive.isSystemDrive || !isOwnerConsoleApp(drive.appId)) return [];
    if (!driveMeta?.driveSlug || !driveMeta.driveTypeSlug) return [];
    return [{ drive, driveSlug: driveMeta.driveSlug, driveTypeSlug: driveMeta.driveTypeSlug }];
  });
};
