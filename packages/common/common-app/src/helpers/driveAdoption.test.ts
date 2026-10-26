import { expect, test } from 'vitest';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import { getDriveAdoptions } from './driveAdoption';
import { OWNER_APP_ID } from '../constants';

const APP = 'c762ee78-4274-4734-8091-9d8080d7a825';
const OTHER_APP = '5f887d80-0132-4294-ba40-bda79155551d';
const target = { alias: 'aaaa', type: 'bbbb' };

const drive = (overrides: Partial<DriveDefinition> = {}) =>
  ({ targetDriveInfo: target, isSystemDrive: false, appId: OWNER_APP_ID, ...overrides }) as DriveDefinition;
const request = (driveMeta?: { driveSlug?: string; driveTypeSlug?: string }) => ({
  permissionedDrive: { drive: { ...target } },
  driveMeta,
});
const slugs = { driveSlug: 'notes', driveTypeSlug: 'notes' };

test('a drive the owner console owns is adopted at the address the app asks for', () => {
  const existing = drive();
  expect(getDriveAdoptions(APP, [request(slugs)], [existing])).toEqual([
    { drive: existing, ...slugs },
  ]);
});

test('so is one with no owning app at all', () => {
  expect(getDriveAdoptions(APP, [request(slugs)], [drive({ appId: null })])).toHaveLength(1);
  expect(getDriveAdoptions(APP, [request(slugs)], [drive({ appId: undefined })])).toHaveLength(1);
});

test("a drive another app owns is never moved, nor one the app already owns", () => {
  expect(getDriveAdoptions(APP, [request(slugs)], [drive({ appId: OTHER_APP })])).toEqual([]);
  expect(getDriveAdoptions(APP, [request(slugs)], [drive({ appId: APP })])).toEqual([]);
});

test('system drives are never touched', () => {
  expect(getDriveAdoptions(APP, [request(slugs)], [drive({ isSystemDrive: true })])).toEqual([]);
});

test('needs both slugs, and a drive that exists', () => {
  expect(getDriveAdoptions(APP, [request({ driveTypeSlug: 'notes' })], [drive()])).toEqual([]);
  expect(getDriveAdoptions(APP, [request()], [drive()])).toEqual([]);
  expect(getDriveAdoptions(APP, [request(slugs)], [])).toEqual([]);
  expect(getDriveAdoptions(APP, [request(slugs)], undefined)).toEqual([]);
});

test('the owner console adopts nothing for itself', () => {
  expect(getDriveAdoptions(OWNER_APP_ID, [request(slugs)], [drive()])).toEqual([]);
  expect(getDriveAdoptions(undefined, [request(slugs)], [drive()])).toEqual([]);
});
