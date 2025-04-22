import { processInbox } from '@homebase-id/js-lib/peer';
import { useQuery } from '@tanstack/react-query';
import { useOdinClientContext } from '@homebase-id/common-app';

const BATCH_SIZE = 100;
export const useOwnerInboxProcessor = (connected?: boolean) => {
  const odinClient = useOdinClientContext();

  const fetchData = async () =>
    await processInbox(
      odinClient,
      { alias: '90f5e74ab7f9efda0ac298373a32ad8c', type: '90f5e74ab7f9efda0ac298373a32ad8c' },
      BATCH_SIZE
    );

  return useQuery({
    queryKey: ['process-owner-inbox'],
    queryFn: fetchData,
    enabled: connected,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
