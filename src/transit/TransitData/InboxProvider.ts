import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/DriveData/DriveTypes';

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
