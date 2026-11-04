import { expect, test, vi } from 'vitest';
import { ApiType, DotYouClient } from '../DotYouClient';
import { deleteReaction, getReactions, uploadReaction } from './ReactionService';
import { deleteGroupReaction } from './GroupReactionService';

const drive = {
  alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
  type: '8f448716e34cedf9014145e043ca6612',
};
const fileId = '5a3503d3-c99e-4392-bcf0-8dc0c71919e2';

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
    return { post: record('post'), delete: record('delete') } as unknown as ReturnType<
      DotYouClient['createAxiosClient']
    >;
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

test('a reaction on another identity, or by globalTransitId, stays on V1', async () => {
  const { dotYouClient, calls } = recordingClient();

  await uploadReaction(dotYouClient, '👍', 'sam.dotyou.cloud', { targetDrive: drive, fileId });
  await uploadReaction(dotYouClient, '👍', 'frodo.dotyou.cloud', {
    targetDrive: drive,
    globalTransitId: fileId,
  });

  expect(calls.map((c) => [c.v2, c.url])).toEqual([
    [false, '/transit/reactions/add'],
    [false, '/drive/files/reactions/add'],
  ]);
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

test('an anonymous visitor stays on V1, which V2 reaction routes do not admit', async () => {
  const { dotYouClient, calls } = recordingClient(false);

  await getReactions(dotYouClient, 'frodo.dotyou.cloud', { targetDrive: drive, fileId }, 10, 'c');

  expect(calls.map((c) => c.v2)).toEqual([false]);
});
