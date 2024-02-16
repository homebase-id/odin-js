import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { GetProfileCard } from '@youfoundation/js-lib/public';

export const useExternalOdinId = ({ odinId }: { odinId?: string }) => {
  const dotYouClient = new DotYouClient({ api: ApiType.Guest, identity: odinId });

  const fetchSingle = async ({ odinId }: { odinId?: string }) => {
    if (!odinId) return;
    return (await GetProfileCard(dotYouClient)) || null;
  };

  return {
    fetch: useQuery({
      queryKey: ['connectionDetails', odinId],
      queryFn: () => fetchSingle({ odinId }),
      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),
  };
};
