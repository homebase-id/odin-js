import { processInbox } from '@homebase-id/js-lib/peer';
import { useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '@homebase-id/common-app';

const BATCH_SIZE = 100;
export const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchData = async () =>
    await processInbox(
      dotYouClient,
      { alias: '90f5e74ab7f9efda0ac298373a32ad8c', type: '90f5e74ab7f9efda0ac298373a32ad8c' },
      BATCH_SIZE
    );

  return useQuery({
    queryKey: ['process-inbox'],
    queryFn: fetchData,
    enabled: connected,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
