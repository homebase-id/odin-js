import { expect, test } from 'vitest';
import { DrivePermissionType } from '../../core/DriveData/Drive/DriveTypes';
import {
  AppAuthorizationParams,
  getRegistrationParams,
  parseAppCircleRequest,
} from './AuthenticationProvider';
import { createEccPair } from './EccKeyProvider';

const drive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

const register = async (appCircles?: Parameters<typeof getRegistrationParams>[13]) => {
  const keys = await createEccPair();
  const params = await getRegistrationParams(
    'https://app/callback',
    'Some App',
    'b1e6a5a2-0a7b-4c3e-8f2a-1d2c3b4a5f60',
    'some-app',
    [10],
    undefined,
    [],
    undefined,
    undefined,
    keys.publicKey,
    undefined,
    'Firefox | macOS',
    undefined,
    appCircles
  );
  return JSON.parse(params.permission_request) as AppAuthorizationParams;
};

test('parseAppCircleRequest uses the short wire keys and sums the drive permission', () => {
  expect(
    parseAppCircleRequest({
      slug: 'sync',
      name: 'Sync',
      description: 'People I sync with',
      emoji: '🔄',
      driveGrants: [
        { ...drive, permissions: [DrivePermissionType.Read, DrivePermissionType.Write] },
      ],
      permissionKeys: [10],
    })
  ).toEqual({
    s: 'sync',
    n: 'Sync',
    d: 'People I sync with',
    e: '🔄',
    g: [{ a: drive.alias, t: drive.type, p: 3 }],
    k: [10],
  });
});

test('a declared circle is sent as ac', async () => {
  const request = await register([{ slug: 'sync', name: 'Sync' }]);
  expect(JSON.parse(request.ac as string)).toEqual([{ s: 'sync', n: 'Sync' }]);
});

test('an app that declares no circle sends no ac', async () => {
  expect((await register()).ac).toBeUndefined();
  expect((await register([])).ac).toBeUndefined();
});
