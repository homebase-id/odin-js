import { expect, test } from 'vitest';
import { getDrivePermissionFromString } from './PermissionHelpers';
import { DrivePermissionType } from '../../core';

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
