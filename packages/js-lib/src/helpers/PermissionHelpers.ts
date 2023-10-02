import { DrivePermissionType, PermissionedDrive } from '../core/DriveData/DriveTypes';
import { DriveGrant } from '../network/network';
import { AppPermissionType } from '../network/permission/PermissionTypes';

const getPermissionFromNumber = (
  value: number,
  levels: typeof DrivePermissionType | typeof AppPermissionType
): { name: string; value: number } => {
  const directMatch = DrivePermissionType[value];
  if (directMatch) return { name: directMatch, value: value };

  const numericLevels = Object.values(levels).filter((v) => typeof v === 'number') as number[];

  const numericMatch = numericLevels.reduce((prevValue, currValue) => {
    if (currValue > prevValue && currValue <= value) {
      return currValue;
    }

    return prevValue;
  }, numericLevels[0]);

  return { name: levels[numericMatch], value: numericMatch };
};

export const getDrivePermissionFromNumber = (value?: DrivePermissionType[]) => {
  if (!value || !Array.isArray(value)) return 'none';

  const permissions = value?.map((permission) => {
    return getPermissionFromNumber(permission, DrivePermissionType);
  });
  if (permissions.length === 0) return 'none';

  return permissions.map((obj) => obj.name).join(', ');
};

export const getAppPermissionFromNumber = (value: number) =>
  getPermissionFromNumber(value, AppPermissionType);

/// Convert text based permission levels to the numbered type
// Reflects DrivePermission enum in services/Odin.Core.Services/Drives/DrivePermission.cs
export const getDrivePermissionFromString = (permission: unknown): DrivePermissionType[] => {
  if (typeof permission !== 'string') {
    return [];
  }

  let lowered = permission.toLowerCase();

  // Convert multi types to their simpler form
  lowered = lowered.replace('writereactionsandcomments', 'react,comment');
  lowered = lowered.replace('readwrite', 'read,write,react,comment');
  lowered = lowered.replace('all', 'read,write,react,comment');

  const parts = lowered.split(',');

  // Convert the simple types to the enum
  const permissions = parts
    .map((part) => {
      const permission = part.trim();
      return permission === 'read'
        ? DrivePermissionType.Read
        : permission === 'write'
        ? DrivePermissionType.Write
        : permission === 'react'
        ? DrivePermissionType.React
        : permission === 'comment'
        ? DrivePermissionType.Comment
        : undefined;
    })
    .filter(Boolean) as DrivePermissionType[];

  return permissions;
};

export const getUniqueDrivesWithHighestPermission = (grants: DriveGrant[]) =>
  grants?.reduce((prevValue, grantedDrive) => {
    const existingGrantIndex = prevValue.findIndex(
      (driveGrant) =>
        driveGrant.permissionedDrive.drive.alias === grantedDrive.permissionedDrive.drive.alias &&
        driveGrant.permissionedDrive.drive.type === grantedDrive.permissionedDrive.drive.type
    );

    if (existingGrantIndex !== -1) {
      prevValue[existingGrantIndex].permissionedDrive.permission = Array.from(
        new Set([
          ...prevValue[existingGrantIndex].permissionedDrive.permission,
          ...grantedDrive.permissionedDrive.permission,
        ])
      );
      return prevValue;
    } else {
      return [...prevValue, grantedDrive];
    }
  }, [] as DriveGrant[]);

export const getPermissionNumberFromDrivePermission = (permission: PermissionedDrive) => {
  return { ...permission, permission: permission.permission.reduce((a, b) => a + b, 0) };
};
