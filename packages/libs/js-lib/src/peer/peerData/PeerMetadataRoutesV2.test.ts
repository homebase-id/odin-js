import { expect, test, vi } from 'vitest';
import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { getDrivesByType } from '../../core/DriveData/Drive/DriveProvider';
import { getFileHeaderBytesByGlobalTransitId } from '../../core/DriveData/File/DriveFileByGlobalTransitIdProvider';
import { getSecurityContextOverPeer } from '../../core/SecurityData/SecurityProvider';
import { getDrivesByTypeOverPeer } from './Drive/PeerDriveProvider';
import { getFileHeaderBytesOverPeerByUniqueId } from './File/PeerFileByUniqueIdProvider';

const drive = {
  alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
  type: '8f448716e34cedf9014145e043ca6612',
};
const id = '7b1be23b-48bb-4304-bc7b-db5910c09a1a';
const peer = 'sam.dotyou.cloud';

const recordingClient = (data: unknown) => {
  const dotYouClient = new DotYouClient({ api: ApiType.App, hostIdentity: 'frodo.dotyou.cloud' });
  const calls: [boolean, string][] = [];
  vi.spyOn(dotYouClient, 'createAxiosClient').mockImplementation((options) => {
    return {
      get: async (url: string) => {
        calls.push([!!options?.v2, url]);
        return { data };
      },
    } as unknown as ReturnType<DotYouClient['createAxiosClient']>;
  });
  return { dotYouClient, calls };
};

test('drives by type go to V2, locally and over peer, and keep targetDriveInfo', async () => {
  const { dotYouClient, calls } = recordingClient({ results: [{ targetDrive: drive }] });

  const local = await getDrivesByType(dotYouClient, drive.type, 1, 25);
  const remote = await getDrivesByTypeOverPeer(dotYouClient, drive.type, peer);

  expect(calls).toEqual([
    [true, `/drives?type=${drive.type}&pageNumber=1&pageSize=25`],
    [true, `/peer/${peer}/drives?type=${drive.type}`],
  ]);
  expect(local.results[0].targetDriveInfo).toEqual(drive);
  expect(remote.results[0].targetDriveInfo).toEqual(drive);
});

test('the peer security context goes to V2', async () => {
  const { dotYouClient, calls } = recordingClient({ permissionContext: { permissionGroups: [] } });

  await getSecurityContextOverPeer(dotYouClient, peer);

  expect(calls).toEqual([[true, `/peer/${peer}/auth/context`]]);
});

test('the header by uniqueId over peer and by globalTransitId locally go to V2', async () => {
  const { dotYouClient, calls } = recordingClient({ fileMetadata: { appData: {} } });

  await getFileHeaderBytesOverPeerByUniqueId(dotYouClient, peer, drive, id, { decrypt: false });
  await getFileHeaderBytesByGlobalTransitId(dotYouClient, drive, id, { decrypt: false });

  expect(calls).toEqual([
    [true, `/peer/${peer}/drives/${drive.alias}/files/by-uid/${id}/header`],
    [true, `/drives/${drive.alias}/files/by-gtid/${id}/header`],
  ]);
});
