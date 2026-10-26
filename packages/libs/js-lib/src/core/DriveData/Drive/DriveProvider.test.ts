import { expect, test, vi } from 'vitest';
import { DotYouClient } from '../../DotYouClient';
import { ensureDrive, getRequestedDriveChanges } from './DriveProvider';
import { DriveDefinition } from './DriveTypes';

const targetDrive = {
  alias: 'd5f411fa83fd4854a3bd7e974cc9bca9',
  type: '30743710039d4b97bbd352f343d1c9df',
};
const appId = '0babb1e6-7604-4bcd-b1fb-87e959226492';

const clientWithDrives = (existing: Partial<DriveDefinition>[]) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const post = vi.fn((url: string, _data?: unknown) =>
    Promise.resolve(
      url === 'drive/mgmt' ? { status: 200, data: { results: existing } } : { status: 200 }
    )
  );
  return { post, client: { createAxiosClient: () => ({ post }) } as unknown as DotYouClient };
};

const ensure = (client: DotYouClient, attributes?: { [key: string]: string }) =>
  ensureDrive(
    client,
    targetDrive,
    'Notes',
    undefined,
    true,
    true,
    false,
    appId,
    'notes',
    'notes',
    attributes
  );

test('ensureDrive sends the requested attributes when it creates the drive', async () => {
  const { post, client } = clientWithDrives([]);

  await ensure(client, { IsCollaborativeChannel: 'true' });

  expect(post).toHaveBeenCalledWith(
    '/drive/mgmt/create',
    expect.objectContaining({
      targetDrive,
      allowSubscriptions: true,
      attributes: { IsCollaborativeChannel: 'true' },
    })
  );
});

test('ensureDrive without attributes still creates the drive', async () => {
  const { post, client } = clientWithDrives([]);

  await ensure(client);

  const createBody = post.mock.calls.find(([url]) => url === '/drive/mgmt/create')?.[1] as
    | Record<string, unknown>
    | undefined;
  expect(createBody).toMatchObject({ targetDrive, driveSlug: 'notes' });
  expect(createBody?.attributes).toBeUndefined();
});

test('ensureDrive does not create a drive that already exists', async () => {
  const { post, client } = clientWithDrives([{ targetDriveInfo: targetDrive, appId }]);

  expect(await ensure(client, { IsCollaborativeChannel: 'true' })).toBe(true);
  expect(post).not.toHaveBeenCalledWith('/drive/mgmt/create', expect.anything());
});

test('getRequestedDriveChanges keeps the attributes a drive has, and the requested ones win', () => {
  const drive = {
    allowSubscriptions: true,
    attributes: { Theme: 'dark', IsCollaborativeChannel: 'false' },
  };

  expect(
    getRequestedDriveChanges(drive, { attributes: { IsCollaborativeChannel: 'true' } })
  ).toEqual({
    attributes: { Theme: 'dark', IsCollaborativeChannel: 'true' },
  });
});

test('getRequestedDriveChanges adds attributes to a drive that has none', () => {
  const drive = {
    allowSubscriptions: false,
    attributes: null as unknown as { [key: string]: string },
  };

  expect(
    getRequestedDriveChanges(drive, { attributes: { IsCollaborativeChannel: 'true' } })
  ).toEqual({
    attributes: { IsCollaborativeChannel: 'true' },
  });
});

test('getRequestedDriveChanges is empty when the drive already has what was requested', () => {
  const drive = {
    allowSubscriptions: true,
    attributes: { IsCollaborativeChannel: 'true', Theme: 'dark' },
  };

  expect(
    getRequestedDriveChanges(drive, {
      allowSubscriptions: true,
      attributes: { IsCollaborativeChannel: 'true' },
    })
  ).toEqual({});
  expect(getRequestedDriveChanges(drive, undefined)).toEqual({});
});

test('getRequestedDriveChanges turns subscriptions on, never off', () => {
  expect(
    getRequestedDriveChanges(
      { allowSubscriptions: false, attributes: {} },
      { allowSubscriptions: true }
    )
  ).toEqual({
    allowSubscriptions: true,
  });
  expect(
    getRequestedDriveChanges(
      { allowSubscriptions: true, attributes: {} },
      { allowSubscriptions: false }
    )
  ).toEqual({});
});
