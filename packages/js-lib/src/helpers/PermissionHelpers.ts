import { DrivePermissionType } from '../core/DriveData/DriveTypes';
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

export const getDrivePermissionFromNumber = (value: number) =>
  getPermissionFromNumber(value, DrivePermissionType);

export const getAppPermissionFromNumber = (value: number) =>
  getPermissionFromNumber(value, AppPermissionType);

/// Convert text based permission levels to the numbered type
// Reflects DrivePermission enum in services/Odin.Core.Services/Drives/DrivePermission.cs
export const getDrivePermissionFromString = (permission: unknown): DrivePermissionType => {
  if (typeof permission !== 'string') {
    return DrivePermissionType.None;
  }

  const lowered = permission.toLowerCase();
  return lowered === 'read'
    ? DrivePermissionType.Read
    : lowered === 'write'
    ? DrivePermissionType.Write
    : lowered === 'read, write'
    ? DrivePermissionType.ReadWrite
    : lowered === 'react'
    ? DrivePermissionType.React
    : lowered === 'comment'
    ? DrivePermissionType.Comment
    : lowered === 'read, react'
    ? DrivePermissionType.ReadAndWriteReactions
    : lowered === 'read, writereactionsandcomments'
    ? DrivePermissionType.ReadAndWriteReactionsAndComments
    : lowered === 'writereactionsandcomments'
    ? DrivePermissionType.WriteReactionsAndComments
    : lowered === 'readwrite' || lowered === 'all'
    ? DrivePermissionType.Full
    : DrivePermissionType.None;
};
