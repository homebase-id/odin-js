import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/core';

type ProcessInboxResponse = {
  totalItems: number;
  poppedCount: number;
  oldestItemTimestamp: number;
};

export const processInbox = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  batchSize?: number
) => {
  const client = dotYouClient.createAxiosClient();

  return client
    .post<ProcessInboxResponse>('/transit/inbox/processor/process', {
      targetDrive,
      batchSize,
    })
    .then((response) => response.data);
};
