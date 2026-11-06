import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/core';

type ProcessInboxResponse = {
  totalItems: number;
  poppedCount: number;
  oldestItemTimestamp: number;
};

/// V2 names the drive (its id is the V1 alias) in the route and takes the batch size in the (encrypted) query
/// string. V1 read a missing batchSize as 0, which the processor raises to 1; V2 would default to 10, so the
/// missing case is sent as 1 to keep the batch V1 processed.
export const processInbox = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  batchSize?: number
) => {
  const client = dotYouClient.createAxiosClient({ v2: true });

  return client
    .get<ProcessInboxResponse>(
      `/drives/${targetDrive.alias}/inbox/process?batchSize=${batchSize ?? 1}`
    )
    .then((response) => response.data);
};
