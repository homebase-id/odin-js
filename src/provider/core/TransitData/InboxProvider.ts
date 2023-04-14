import { DotYouClient } from '../DotYouClient';
import { TargetDrive } from '../DriveData/DriveTypes';

export const processInbox = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  batchSize?: number
) => {
  const client = dotYouClient.createAxiosClient();

  return client.post('/transit/inbox/processor/process', {
    targetDrive,
    batchSize,
  });
};
