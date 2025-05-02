import { OdinClient } from '../../core/OdinClient';
import { TargetDrive } from '../../core/core';

type ProcessInboxResponse = {
  totalItems: number;
  poppedCount: number;
  oldestItemTimestamp: number;
};

export const processInbox = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  batchSize?: number
) => {
  const client = odinClient.createAxiosClient();

  return client
    .post<ProcessInboxResponse>('/transit/inbox/processor/process', {
      targetDrive,
      batchSize,
    })
    .then((response) => response.data);
};
