import { expect, test } from 'vitest';
import {
  getDrivePermissionFromString,
  getPermissionNumberFromDrivePermission,
} from './PermissionHelpers';
import { DrivePermissionType } from '../core/DriveData/Drive/DriveTypes';

test('Get read write permissions', () => {
  // Individual permissions
  expect(getDrivePermissionFromString('read')).toEqual([DrivePermissionType.Read]);
  expect(getDrivePermissionFromString('write')).toEqual([DrivePermissionType.Write]);
  expect(getDrivePermissionFromString('comment')).toEqual([DrivePermissionType.Comment]);
  expect(getDrivePermissionFromString('react')).toEqual([DrivePermissionType.React]);

  // Multi permissions
  expect(getDrivePermissionFromString('read,write,comment, react')).toEqual([
    DrivePermissionType.Read,
    DrivePermissionType.Write,
    DrivePermissionType.Comment,
    DrivePermissionType.React,
  ]);

  // Complex permissions
  expect(getDrivePermissionFromString('writereactionsandcomments')).toEqual([
    DrivePermissionType.React,
    DrivePermissionType.Comment,
  ]);
  expect(getDrivePermissionFromString('readwrite')).toEqual([
    DrivePermissionType.Read,
    DrivePermissionType.Write,
    DrivePermissionType.React,
    DrivePermissionType.Comment,
  ]);
  expect(getDrivePermissionFromString('all')).toEqual([
    DrivePermissionType.Read,
    DrivePermissionType.Write,
    DrivePermissionType.React,
    DrivePermissionType.Comment,
  ]);
});

test('Drive permission flags combine into one number', () => {
  const drive = { alias: 'a', type: 't' };
  const toNumber = (permission: number[]) =>
    getPermissionNumberFromDrivePermission({ drive, permission }).permission;

  expect(toNumber([DrivePermissionType.Read, DrivePermissionType.Write])).toBe(3);
  // Overlapping flags, as getUniqueDrivesWithHighestPermission's unions can hold them.
  expect(toNumber([3, DrivePermissionType.Read])).toBe(3);
  expect(toNumber([])).toBe(0);
});
