import { DrivePermissionType, PermissionedDrive } from '../core/DriveData/DriveTypes';
import { DriveGrant } from '../network/network';
import { AppPermissionType } from '../network/permission/PermissionTypes';

export const getDrivePermissionFromNumber = (value?: number[]) => {
  if (!value || !Array.isArray(value)) return 'none';

  const permissions = value.map((permission) => {
    const directMatch = DrivePermissionType[permission];
    if (directMatch) return directMatch;

    if (permission === DrivePermissionType.Read + DrivePermissionType.Write) return 'ReadAndWrite';
    if (permission === DrivePermissionType.React + DrivePermissionType.Comment)
      return 'ReactAndComment';

    if (
      permission ===
      DrivePermissionType.Read +
        DrivePermissionType.Write +
        DrivePermissionType.React +
        DrivePermissionType.Comment
    )
      return 'full';

    return 'none';
  });
  if (permissions.length === 0) return 'none';

  return permissions.join(', ');
};

export const getAppPermissionFromNumber = (value: number) => {
  const directMatch = AppPermissionType[value];
  if (directMatch) return directMatch;

  return 'none';
};

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
