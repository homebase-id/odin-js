import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, GetProfileCard } from '@youfoundation/js-lib';

const useExternalOdinId = ({ odinId }: { odinId?: string }) => {
  const dotYouClient = new DotYouClient({ api: ApiType.YouAuth, root: odinId });

  const fetchSingle = async ({ odinId }: { odinId?: string }) => {
    if (!odinId) {
      return;
    }

    return await GetProfileCard(dotYouClient);
  };

  return {
    fetch: useQuery(['connectionDetails', odinId], () => fetchSingle({ odinId }), {
      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),
  };
};

export default useExternalOdinId;
