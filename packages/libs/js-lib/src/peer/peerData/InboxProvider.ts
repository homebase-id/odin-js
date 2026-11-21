import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/core';

type ProcessInboxResponse = {
  totalItems: number;
  poppedCount: number;
  oldestItemTimestamp: number;
};

/// A missing batchSize is sent as 1: V1 processed 1, where V2 would default to 10
export const processInbox = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  batchSize?: number
) => {
  const client = dotYouClient.createAxiosClient();

  return client
    .get<ProcessInboxResponse>(
      `/drives/${targetDrive.alias}/inbox/process?batchSize=${batchSize ?? 1}`
    )
    .then((response) => response.data);
};
