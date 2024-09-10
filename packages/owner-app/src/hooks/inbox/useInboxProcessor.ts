import { processInbox } from '@homebase-id/js-lib/peer';
import { useQuery } from '@tanstack/react-query';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { useDotYouClient } from '@homebase-id/common-app';

const BATCH_SIZE = 100;
export const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchData = async () =>
    await processInbox(
      dotYouClient,
      GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
      BATCH_SIZE
    );

  return useQuery({
    queryKey: ['process-inbox'],
    queryFn: fetchData,
    enabled: connected,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
