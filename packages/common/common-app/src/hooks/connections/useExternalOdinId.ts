import { useQuery } from '@tanstack/react-query';
import { GetProfileCard } from '@homebase-id/js-lib/public';
const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;

export const useExternalOdinId = ({ odinId }: { odinId?: string }) => {
  const fetchSingle = async ({ odinId }: { odinId?: string }) => {
    if (!odinId || !domainRegex.test(odinId)) return null;
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
