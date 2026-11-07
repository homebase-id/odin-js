import { expect, test, vi } from 'vitest';
import { DotYouClient } from '../../DotYouClient';
import { getTransferHistory } from './DriveFileProvider';
import { TransferStatus } from './DriveFileTypes';

const targetDrive = {
  alias: 'd5f411fa83fd4854a3bd7e974cc9bca9',
  type: '30743710039d4b97bbd352f343d1c9df',
};
const fileId = '0babb1e6-7604-4bcd-b1fb-87e959226492';

const clientReturning = (get: () => Promise<unknown>) =>
  ({ createAxiosClient: () => ({ get }) }) as unknown as DotYouClient;

test('getTransferHistory lowercases the camelCase status the server sends', async () => {
  const client = clientReturning(() =>
    Promise.resolve({
      data: {
        originalRecipientCount: 1,
        history: {
          request: { pageNumber: 1, pageSize: 10 },
          totalPages: 1,
          results: [
            {
              recipient: 'frodo.dotyou.cloud',
              latestTransferStatus: 'recipientIdentityReturnedInvalidKeyHeader',
            },
          ],
        },
      },
    })
  );

  const result = await getTransferHistory(client, targetDrive, fileId);

  expect(result?.history.results[0].latestTransferStatus).toBe(
    TransferStatus.RecipientIdentityReturnedInvalidKeyHeader
  );
  expect(result?.originalRecipientCount).toBe(1);
});

test('a status the server has no name for does not lose the other recipients', async () => {
  const client = clientReturning(() =>
    Promise.resolve({
      data: {
        history: {
          results: [
            { recipient: 'frodo.dotyou.cloud', latestTransferStatus: 60 },
            { recipient: 'sam.dotyou.cloud', latestTransferStatus: 'delivered' },
          ],
        },
      },
    })
  );

  const result = await getTransferHistory(client, targetDrive, fileId);

  expect(result?.history.results.map((r) => r.latestTransferStatus)).toEqual([
    '60',
    TransferStatus.Delivered,
  ]);
});

test('getTransferHistory returns null when the file is not found', async () => {
  const client = clientReturning(() => Promise.reject({ response: { status: 404 } }));

  await expect(getTransferHistory(client, targetDrive, fileId)).resolves.toBeNull();
});

test('getTransferHistory returns null for an empty response, without logging an error', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const client = clientReturning(() => Promise.resolve({ status: 204, data: '' }));

  await expect(getTransferHistory(client, targetDrive, fileId)).resolves.toBeNull();
  expect(consoleError).not.toHaveBeenCalled();

  consoleError.mockRestore();
});
