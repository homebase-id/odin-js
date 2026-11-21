import { expect, test, vi } from 'vitest';
import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { queryBatchOverPeer } from './Query/PeerDriveQueryService';
import {
  getFileHeaderBytesOverPeer,
  getPayloadBytesOverPeer,
  getThumbBytesOverPeer,
} from './File/PeerFileProvider';
import {
  getFileHeaderBytesOverPeerByGlobalTransitId,
  getPayloadBytesOverPeerByGlobalTransitId,
} from './File/PeerFileByGlobalTransitProvider';
import { deleteFileOverPeer } from './File/PeerFileManager';
import { sendReadReceipt } from './File/PeerReadReceiptManager';
import { processInbox } from './InboxProvider';

const drive = {
  alias: 'e8475dc46cb4b6651c2d0dbd0f3aad5f',
  type: '8f448716e34cedf9014145e043ca6612',
};
const fileId = '5a3503d3-c99e-4392-bcf0-8dc0c71919e2';
const gtid = '7b1be23b-48bb-4304-bc7b-db5910c09a1a';
const peer = 'sam.dotyou.cloud';

// Records every request, which API version the client was created for, and whether it skips the shared secret
const recordingClient = () => {
  const dotYouClient = new DotYouClient({ api: ApiType.App, hostIdentity: 'frodo.dotyou.cloud' });
  const calls: {
    v2: boolean;
    plain: boolean;
    method: string;
    url: string;
    data?: unknown;
    range?: unknown;
  }[] = [];
  vi.spyOn(dotYouClient, 'createAxiosClient').mockImplementation((options) => {
    const v2 = !!options?.v2;
    const plain = !!options?.overrideEncryption;
    const record =
      (method: string) =>
      async (url: string, dataOrConfig?: unknown, config?: { headers?: { range?: string } }) => {
        const isGet = method === 'get';
        calls.push({
          v2,
          plain,
          method,
          url,
          ...(isGet ? {} : { data: dataOrConfig }),
          ...(config?.headers?.range ? { range: config.headers.range } : {}),
        });
        if (url.endsWith('/send-read-receipt-batch'))
          return { status: 200, data: { results: [{ fileId, status: [] }] } };
        if (url.includes('/header'))
          return { status: 200, data: { fileMetadata: { isEncrypted: false, appData: {} } } };
        return { status: 200, data: isGet ? null : { searchResults: [] } };
      };
    return { get: record('get'), post: record('post') } as unknown as ReturnType<
      DotYouClient['createAxiosClient']
    >;
  });
  return { dotYouClient, calls };
};

test('peer reads name the peer and drive in the V2 path', async () => {
  const { dotYouClient, calls } = recordingClient();

  await queryBatchOverPeer(dotYouClient, peer, { targetDrive: drive, fileType: [1] });
  await getFileHeaderBytesOverPeer(dotYouClient, peer, drive, fileId, { decrypt: false });
  await getPayloadBytesOverPeer(dotYouClient, peer, drive, fileId, 'pst_mdi0', {
    lastModified: 5,
  });
  await getPayloadBytesOverPeer(dotYouClient, peer, drive, fileId, 'pst_mdi0', {
    chunkStart: 0,
    chunkEnd: 100,
  });
  await getThumbBytesOverPeer(dotYouClient, peer, drive, fileId, 'pst_mdi0', 20, 30);
  await getFileHeaderBytesOverPeerByGlobalTransitId(dotYouClient, peer, drive, gtid, {
    decrypt: false,
  });
  await getPayloadBytesOverPeerByGlobalTransitId(dotYouClient, peer, drive, gtid, 'k');

  const root = `/peer/${peer}/drives/${drive.alias}`;
  expect(calls).toEqual([
    {
      v2: true,
      plain: false,
      method: 'post',
      url: `${root}/query-batch`,
      data: {
        queryParams: { fileType: [1], fileState: [1] },
        resultOptionsRequest: expect.objectContaining({ maxRecords: 10 }),
      },
    },
    { v2: true, plain: false, method: 'get', url: `${root}/files/${fileId}/header` },
    {
      v2: true,
      plain: true,
      method: 'get',
      url: `${root}/files/${fileId}/payload/pst_mdi0?lastModified=5`,
    },
    // A ranged read uses the ranged route, not a Range header: 0..111 is 112 bytes
    { v2: true, plain: true, method: 'get', url: `${root}/files/${fileId}/payload/pst_mdi0/0/112` },
    {
      v2: true,
      plain: true,
      method: 'get',
      url: `${root}/files/${fileId}/payload/pst_mdi0/thumb/20/30`,
    },
    { v2: true, plain: false, method: 'get', url: `${root}/files/by-gtid/${gtid}/header` },
    { v2: true, plain: true, method: 'get', url: `${root}/files/by-gtid/${gtid}/payload/k` },
  ]);
});

test('peer writes and inbox processing go to V2', async () => {
  const { dotYouClient, calls } = recordingClient();

  await deleteFileOverPeer(dotYouClient, drive, gtid, [peer]);
  const receipt = await sendReadReceipt(dotYouClient, drive, [fileId]);
  await processInbox(dotYouClient, drive);

  expect(calls).toEqual([
    {
      v2: true,
      plain: true,
      method: 'post',
      url: `/peer/${peer}/drives/${drive.alias}/files/senddeleterequest`,
      data: {
        fileSystemType: 'Standard',
        globalTransitIdFileIdentifier: { targetDrive: drive, globalTransitId: gtid },
        recipients: [peer],
      },
    },
    {
      v2: true,
      plain: false,
      method: 'post',
      url: `/drives/${drive.alias}/files/send-read-receipt-batch`,
      data: { files: [fileId] },
    },
    {
      v2: true,
      plain: false,
      method: 'get',
      url: `/drives/${drive.alias}/inbox/process?batchSize=1`,
    },
  ]);
  // V2's result carries only the file id; the drive is put back for V1's shape
  expect(receipt).toEqual({ results: [{ file: { targetDrive: drive, fileId }, status: [] }] });
});
