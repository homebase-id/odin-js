import { expect, test, vi } from 'vitest';
import { ApiType, DotYouClient } from './DotYouClient';
import {
  deleteDrive,
  editDriveAllowAnonymousRead,
  editDriveAllowCdn,
  editDriveAllowSubscriptions,
  editDriveArchiveFlag,
  editDriveAttributes,
  editDriveMetadata,
  emptyDrive,
  ensureDrive,
  getDrivePurges,
  getDrives,
  getDrivesByType,
  reassignDriveOwningApp,
  retryDrivePurge,
  setDriveOwningApp,
} from './DriveData/Drive/DriveProvider';
import {
  createCircleDefinition,
  getCircle,
  getCircles,
  reassignCircleOwningApp,
  setCircleOwningApp,
  updateCircleDefinition,
} from '../network/circle/CircleProvider';
import { fetchMembersOfCircle } from '../network/circle/CircleMembershipManager';
import {
  addDomainToCircle,
  removeDomainFromCircle,
} from '../network/circle/CircleDomainMembershipManager';
import {
  publishFile,
  publishProfileCardFile,
  publishProfileImageFile,
} from '../public/file/FileProvider';
import { CircleDefinition } from '../network/circle/CircleDataTypes';

const drive = { alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f', type: '8f448716e34cedf9014145e043ca6612' };
const appId = '0babb1e6-7604-4bcd-b1fb-87e959226492';
const circleId = 'bb2683fa402aff866e771a6495765a15';
const circle = { id: circleId, name: 'a circle' } as CircleDefinition;

// Records which API version each request's client was created for, and its path
const recordingClient = (data: unknown = { results: [] }) => {
  const dotYouClient = new DotYouClient({ api: ApiType.Owner as never, hostIdentity: 'frodo.dotyou.cloud' });
  const calls: string[] = [];
  vi.spyOn(dotYouClient, 'createAxiosClient').mockImplementation((options) => {
    const version = options?.v2 ? 'v2' : 'v1';
    const record = (method: string) => async (url: string) => {
      calls.push(`${version} ${method} ${url.split('?')[0]}`);
      return { status: 200, data };
    };
    return { get: record('GET'), post: record('POST') } as never;
  });
  return { dotYouClient, calls };
};

test('drive management calls go to V2', async () => {
  const { dotYouClient: c, calls } = recordingClient();

  await getDrives(c, { pageNumber: 1, pageSize: 10 });
  await getDrivesByType(c, drive.type, 1, 10);
  await ensureDrive(c, drive, 'a drive', undefined, false, false, false, appId, 'a-drive', 'drive');
  await editDriveMetadata(c, drive, 'm');
  await editDriveAttributes(c, drive, { k: 'v' });
  await editDriveAllowAnonymousRead(c, drive, true);
  await editDriveAllowSubscriptions(c, drive, true);
  await editDriveAllowCdn(c, drive, true);
  await editDriveArchiveFlag(c, drive, true);
  await emptyDrive(c, drive);
  await deleteDrive(c, drive);
  await getDrivePurges(c);
  await retryDrivePurge(c, drive);
  await setDriveOwningApp(c, drive, appId, 'a-drive', 'drive');
  await reassignDriveOwningApp(c, drive, appId, 'a-drive', 'drive');

  expect(calls).toEqual([
    'v2 POST /drive-management',
    'v2 GET /drive-management/type',
    'v2 POST /drive-management',
    'v2 POST /drive-management/create',
    'v2 POST /drive-management/update-metadata',
    'v2 POST /drive-management/update-attributes',
    'v2 POST /drive-management/set-drive-read-mode',
    'v2 POST /drive-management/set-allow-subscriptions',
    'v2 POST /drive-management/set-allow-cdn',
    'v2 POST /drive-management/set-archive-drive',
    'v2 POST /drive-management/empty',
    'v2 POST /drive-management/delete',
    'v2 GET /drive-management/purges',
    'v2 POST /drive-management/purges/retry',
    'v2 POST /drive-management/set-owner',
    'v2 POST /drive-management/reassign-owner',
  ]);
});

test('circle definition and membership calls go to V2', async () => {
  const { dotYouClient: c, calls } = recordingClient([]);

  await getCircles(c, false);
  await getCircle(c, circleId);
  await createCircleDefinition(c, circle);
  await updateCircleDefinition(c, circle);
  await setCircleOwningApp(c, circleId, appId);
  await reassignCircleOwningApp(c, circleId, appId);
  await fetchMembersOfCircle(c, circleId);
  await addDomainToCircle(c, { domain: 'example.com', circleId });
  await removeDomainFromCircle(c, { domain: 'example.com', circleId });

  expect(calls).toEqual([
    'v2 GET /connections/circles/definitions/list',
    'v2 POST /connections/circles/definitions/get',
    'v2 POST /connections/circles/definitions/create',
    'v2 POST /connections/circles/definitions/update',
    'v2 POST /connections/circles/definitions/set-owner',
    'v2 POST /connections/circles/definitions/reassign-owner',
    'v2 POST /connections/circles/membership/list',
    'v2 POST /youauth-domains/circles/add',
    'v2 POST /youauth-domains/circles/revoke',
  ]);
});

test('static publishing goes to V2', async () => {
  const { dotYouClient: c, calls } = recordingClient();

  await publishFile(c, 'a-file', []);
  await publishProfileCardFile(c, {
    image: 'https://frodo.dotyou.cloud/pub/image',
    givenName: undefined,
    familyName: undefined,
    status: undefined,
    name: 'frodo',
    bio: '',
    bioSummary: undefined,
    links: [],
    email: [],
    sameAs: [],
  });
  await publishProfileImageFile(c, new Uint8Array([1]), 'image/png');

  expect(calls).toEqual([
    'v2 POST /optimization/cdn/publish',
    'v2 POST /optimization/cdn/profile-card',
    'v2 POST /optimization/cdn/profile-image',
  ]);
});
