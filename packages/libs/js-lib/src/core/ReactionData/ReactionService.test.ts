import { expect, test, vi } from 'vitest';
import { ApiType, DotYouClient } from '../DotYouClient';
import { deleteReaction, getReactions, uploadReaction } from './ReactionService';
import {
  deleteGroupReaction,
  getGroupReactions,
  uploadGroupReaction,
} from './GroupReactionService';

const drive = {
  alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
  type: '8f448716e34cedf9014145e043ca6612',
};
const fileId = '5a3503d3-c99e-4392-bcf0-8dc0c71919e2';
const gtid = '7b1be23b-48bb-4304-bc7b-db5910c09a1a';

// Records every request and which API version the client was created for
const recordingClient = (signedIn = true) => {
  const dotYouClient = new DotYouClient({
    api: signedIn ? ApiType.App : ApiType.Guest,
    hostIdentity: 'frodo.dotyou.cloud',
    sharedSecret: signedIn ? new Uint8Array(16) : undefined,
  });
  const calls: { v2: boolean; method: string; url: string; data: unknown }[] = [];
  vi.spyOn(dotYouClient, 'createAxiosClient').mockImplementation((options) => {
    const v2 = !!options?.v2;
    const record = (method: string) => async (url: string, data?: unknown) => {
      calls.push({ v2, method, url, data });
      return {
        data: method === 'post' && url.endsWith('/list') ? { reactions: [], cursor: '' } : null,
      };
    };
    return {
      post: record('post'),
      delete: record('delete'),
      get: async (url: string) => {
        calls.push({ v2, method: 'get', url, data: undefined });
        return { data: { reactions: [], cursor: '' } };
      },
    } as unknown as ReturnType<DotYouClient['createAxiosClient']>;
  });
  return { dotYouClient, calls };
};

test('a reaction on a local file with a fileId goes to V2', async () => {
  const { dotYouClient, calls } = recordingClient();
  const file = { targetDrive: drive, fileId };

  await uploadReaction(dotYouClient, '👍', 'frodo.dotyou.cloud', file);
  await deleteReaction(
    dotYouClient,
    { authorOdinId: 'frodo.dotyou.cloud', body: '👍' },
    'frodo.dotyou.cloud',
    file
  );
  await getReactions(dotYouClient, 'frodo.dotyou.cloud', file, 10, 'c');

  const root = `/drives/${drive.alias}/files/${fileId}/reactions`;
  expect(calls).toEqual([
    { v2: true, method: 'post', url: `${root}/add`, data: { reaction: '{"emoji":"👍"}' } },
    { v2: true, method: 'post', url: `${root}/delete`, data: { reaction: '{"emoji":"👍"}' } },
    { v2: true, method: 'post', url: `${root}/list`, data: { cursor: 'c', maxRecords: 10 } },
  ]);
});

test('a reaction on another identity goes to the V2 peer route by globalTransitId', async () => {
  const { dotYouClient, calls } = recordingClient();
  const file = { targetDrive: drive, globalTransitId: gtid };

  await uploadReaction(dotYouClient, '👍', 'sam.dotyou.cloud', file);
  await deleteReaction(
    dotYouClient,
    { authorOdinId: 'frodo.dotyou.cloud', body: '👍' },
    'sam.dotyou.cloud',
    file
  );
  await getReactions(dotYouClient, 'sam.dotyou.cloud', file, 10, 'c');

  const root = `/peer/sam.dotyou.cloud/drives/${drive.alias}/files/by-gtid/${gtid}/reactions`;
  expect(calls).toEqual([
    { v2: true, method: 'post', url: `${root}/add`, data: { reaction: '{"emoji":"👍"}' } },
    { v2: true, method: 'post', url: `${root}/delete`, data: { reaction: '{"emoji":"👍"}' } },
    { v2: true, method: 'post', url: `${root}/list`, data: { cursor: 'c', maxRecords: 10 } },
  ]);
});

test('a reaction on another identity with no globalTransitId fails before any request', async () => {
  const { dotYouClient, calls } = recordingClient();

  await expect(
    uploadReaction(dotYouClient, '👍', 'sam.dotyou.cloud', { targetDrive: drive, fileId })
  ).rejects.toThrow('globalTransitId');
  expect(calls).toEqual([]);
});

test('a local file known only by globalTransitId stays on V1', async () => {
  const { dotYouClient, calls } = recordingClient();

  await uploadReaction(dotYouClient, '👍', 'frodo.dotyou.cloud', {
    targetDrive: drive,
    globalTransitId: gtid,
  });

  expect(calls.map((c) => [c.v2, c.url])).toEqual([[false, '/drive/files/reactions/add']]);
});

test('a group reaction delete addresses the local file on V2', async () => {
  const { dotYouClient, calls } = recordingClient();

  await deleteGroupReaction(
    dotYouClient,
    drive,
    ['sam.dotyou.cloud'],
    { authorOdinId: 'frodo.dotyou.cloud', body: '👍' },
    { fileId, globalTransitId: 'gtid', targetDrive: drive }
  );

  expect(calls).toEqual([
    {
      v2: true,
      method: 'delete',
      url: `/drives/${drive.alias}/files/${fileId}/group-reactions`,
      data: {
        data: { transitOptions: { recipients: ['sam.dotyou.cloud'] }, reaction: '{"emoji":"👍"}' },
      },
    },
  ]);
});

test('an anonymous visitor reads local reactions on V2', async () => {
  const { dotYouClient, calls } = recordingClient(false);

  await getReactions(dotYouClient, 'frodo.dotyou.cloud', { targetDrive: drive, fileId }, 10, 'c');

  expect(calls.map((c) => [c.v2, c.url])).toEqual([
    [true, `/drives/${drive.alias}/files/${fileId}/reactions/list`],
  ]);
});

test('group reactions addressed by globalTransitId go to V2', async () => {
  const { dotYouClient, calls } = recordingClient();
  const root = `/drives/${drive.alias}/files/by-gtid/${gtid}/group-reactions`;

  await getGroupReactions(
    dotYouClient,
    { target: { globalTransitId: gtid, targetDrive: drive } },
    10
  );
  await uploadGroupReaction(dotYouClient, drive, gtid, '👍', ['sam.dotyou.cloud']);
  await deleteGroupReaction(
    dotYouClient,
    drive,
    ['sam.dotyou.cloud'],
    { authorOdinId: 'frodo.dotyou.cloud', body: '👍' },
    { fileId: '', globalTransitId: gtid, targetDrive: drive }
  );

  expect(calls.map((c) => [c.v2, c.method, c.url])).toEqual([
    [true, 'get', `${root}?maxRecords=10`],
    [true, 'post', root],
    [true, 'delete', root],
  ]);
  expect(calls[1].data).toEqual({
    transitOptions: { recipients: ['sam.dotyou.cloud'] },
    reaction: '{"emoji":"👍"}',
  });
});
