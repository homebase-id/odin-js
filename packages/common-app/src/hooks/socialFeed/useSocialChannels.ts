import { useQuery } from '@tanstack/react-query';
import { getChannelsOverTransit } from '@youfoundation/js-lib/transit';
import { useDotYouClient } from '../../..';

interface useSocialChannelsProps {
  odinId?: string;
}

export const useSocialChannels = ({ odinId }: useSocialChannelsProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({ odinId }: useSocialChannelsProps) => {
    if (!odinId) {
      return;
    }
    return await getChannelsOverTransit(dotYouClient, odinId);
  };

  return {
    fetch: useQuery({
      queryKey: ['channels', odinId],
      queryFn: () => fetch({ odinId }),
      enabled: !!odinId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1,
    }),
  };
};
