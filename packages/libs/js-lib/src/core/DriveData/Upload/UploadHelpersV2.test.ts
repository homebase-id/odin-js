import { test, expect, vi } from 'vitest';
import { DotYouClient } from '../../DotYouClient';
import { pureUpdateOverPeerV2, pureUpdateV2, pureUploadV2 } from './UploadHelpers';
import { TargetDrive } from '../File/DriveFileTypes';

const targetDrive: TargetDrive = {
  alias: '11111111-1111-1111-1111-111111111111',
  type: '22222222-2222-2222-2222-222222222222',
};

const v2Result = {
  fileId: '33333333-3333-3333-3333-333333333333',
  driveId: targetDrive.alias,
  globalTransitId: '44444444-4444-4444-4444-444444444444',
  recipientStatus: { 'sam.dotyou.cloud': 'enqueued' },
  newVersionTag: '55555555-5555-5555-5555-555555555555',
  updated: 1,
  payloads: [],
};

const fakeClient = (response: unknown) => {
  const client = {
    post: vi.fn().mockResolvedValue({ status: 200, data: response }),
    patch: vi.fn().mockResolvedValue({ status: 200, data: response }),
  };
  const createAxiosClient = vi.fn().mockReturnValue(client);
  return {
    client,
    createAxiosClient,
    dotYouClient: { createAxiosClient } as unknown as DotYouClient,
  };
};

test('pureUploadV2 posts to the drive and maps the flattened result back', async () => {
  const { client, createAxiosClient, dotYouClient } = fakeClient(v2Result);

  const result = await pureUploadV2(dotYouClient, targetDrive, new FormData(), 'Comment');

  expect(createAxiosClient).toHaveBeenCalledWith({
    overrideEncryption: true,
    systemFileType: 'Comment',
    v2: true,
  });
  expect(client.post.mock.calls[0][0]).toBe(`/drives/${targetDrive.alias}/files`);
  expect(result).toMatchObject({
    file: { fileId: v2Result.fileId, targetDrive },
    globalTransitIdFileIdentifier: { globalTransitId: v2Result.globalTransitId, targetDrive },
    recipientStatus: v2Result.recipientStatus,
    newVersionTag: v2Result.newVersionTag,
    keyHeader: undefined,
  });
});

test('pureUpdateV2 patches the file and has no gtid identifier for a file never sent', async () => {
  const { client, dotYouClient } = fakeClient({ ...v2Result, globalTransitId: null });
  const file = { fileId: v2Result.fileId, targetDrive };

  const result = await pureUpdateV2(dotYouClient, file, new FormData());

  expect(client.patch.mock.calls[0][0]).toBe(`/drives/${targetDrive.alias}/files/${file.fileId}`);
  expect(result).toMatchObject({ file, globalTransitIdFileIdentifier: null });
});

test('pureUpdateOverPeerV2 patches the file on the recipient by its global transit id', async () => {
  const { client, createAxiosClient, dotYouClient } = fakeClient({
    ...v2Result,
    fileId: '00000000-0000-0000-0000-000000000000',
    updated: null,
  });
  const file = { globalTransitId: v2Result.globalTransitId, targetDrive };

  const result = await pureUpdateOverPeerV2(
    dotYouClient,
    'sam.dotyou.cloud',
    file,
    new FormData(),
    'Comment'
  );

  expect(createAxiosClient).toHaveBeenCalledWith({
    overrideEncryption: true,
    systemFileType: 'Comment',
    v2: true,
  });
  expect(client.patch.mock.calls[0][0]).toBe(
    `/peer/sam.dotyou.cloud/drives/${targetDrive.alias}/files/by-gtid/${file.globalTransitId}`
  );
  expect(result).toMatchObject({
    globalTransitIdFileIdentifier: file,
    recipientStatus: v2Result.recipientStatus,
    newVersionTag: v2Result.newVersionTag,
  });
});

test('pureUpdateOverPeerV2 hands a version conflict to the caller', async () => {
  const { client, dotYouClient } = fakeClient(v2Result);
  client.patch.mockRejectedValue({
    response: { status: 400, data: { errorCode: 'versionTagMismatch' } },
  });
  const retried = { file: undefined } as never;

  const result = await pureUpdateOverPeerV2(
    dotYouClient,
    'sam.dotyou.cloud',
    { globalTransitId: v2Result.globalTransitId, targetDrive },
    new FormData(),
    undefined,
    () => retried
  );

  expect(result).toBe(retried);
});

test('a version conflict hands over to the caller, whose result passes through unmapped', async () => {
  const { client, dotYouClient } = fakeClient(v2Result);
  client.post.mockRejectedValue({
    response: { status: 400, data: { errorCode: 'versionTagMismatch' } },
  });
  const retried = { keyHeader: undefined, file: { fileId: 'x', targetDrive } } as never;

  const result = await pureUploadV2(
    dotYouClient,
    targetDrive,
    new FormData(),
    undefined,
    () => retried
  );

  expect(result).toBe(retried);
});
