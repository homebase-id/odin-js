import { useQuery } from '@tanstack/react-query';
import { GetProfileCard } from '@homebase-id/js-lib/public';

export const useExternalOdinId = ({ odinId }: { odinId?: string }) => {
  const fetchSingle = async ({ odinId }: { odinId?: string }) => {
    if (!odinId) return;
    return (await GetProfileCard(odinId)) || null;
  };

  return {
    fetch: useQuery({
      queryKey: ['external-profile', odinId],
      queryFn: () => fetchSingle({ odinId }),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      enabled: !!odinId,
    }),
  };
};
