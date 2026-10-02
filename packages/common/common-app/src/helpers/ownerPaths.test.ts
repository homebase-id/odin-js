import { expect, test } from 'vitest';
import { getOwnerAppPath, getOwnerCirclePath, getOwnerDrivePath } from './ownerPaths';
import { OWNER_APP_ID } from '../constants';

const appId = '5f887d80-0132-4294-ba40-bda79155551d';
const drive = { alias: 'aaaa', type: 'bbbb' };

test('a drive or circle lives under the app that owns it', () => {
  expect(getOwnerDrivePath(appId, drive)).toBe(`/owner/apps/${appId}/drives/aaaa_bbbb`);
  expect(getOwnerCirclePath(appId, 'cccc')).toBe(`/owner/apps/${appId}/circles/cccc`);
});

test('one owned by no app lives under the owner console', () => {
  expect(getOwnerAppPath(undefined)).toBe(`/owner/apps/${OWNER_APP_ID}`);
  expect(getOwnerAppPath(null)).toBe(`/owner/apps/${OWNER_APP_ID}`);
  expect(getOwnerDrivePath(null, drive)).toBe(`/owner/apps/${OWNER_APP_ID}/drives/aaaa_bbbb`);
});
