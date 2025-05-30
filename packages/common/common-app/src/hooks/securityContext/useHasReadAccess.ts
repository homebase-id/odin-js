import { DrivePermissionType, TargetDrive } from '@homebase-id/js-lib/core';
import { useSecurityContext } from './useSecurityContext';
import { useMemo } from 'react';
import { drivesEqual } from '@homebase-id/js-lib/helpers';

export const useHasReadAccess = (targetDrive: TargetDrive): null | boolean => {
  const { data: securityContext } = useSecurityContext().fetch;

  return useMemo(() => {
    if (!securityContext || !targetDrive) return null;
    if (securityContext.caller.securityLevel === 'owner') return true;

    const anyPermissionGroupWithReadAccess =
      securityContext.permissionContext.permissionGroups.some((permissionGroup) => {
        return permissionGroup.driveGrants.some((driveGrant) => {
          const isTargetDriveGrant = drivesEqual(driveGrant.permissionedDrive.drive, targetDrive);
          if (!isTargetDriveGrant) return false;

          return driveGrant.permissionedDrive.permission.some(
            (p) => p === DrivePermissionType.Read
          );
        });
      });

    return anyPermissionGroupWithReadAccess;
  }, [securityContext, targetDrive]);
};
