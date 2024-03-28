import { useQuery } from '@tanstack/react-query';
import { GetProfileCard } from '@youfoundation/js-lib/public';

export const useExternalOdinId = ({ odinId }: { odinId?: string }) => {
  const fetchSingle = async ({ odinId }: { odinId?: string }) => {
    if (!odinId) return;
    return (await GetProfileCard(odinId)) || null;
  };

  return {
    fetch: useQuery({
      queryKey: ['connectionDetails', odinId],
      queryFn: () => fetchSingle({ odinId }),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: !!odinId,
    }),
  };
};
