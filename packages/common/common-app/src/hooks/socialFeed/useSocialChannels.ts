import { useQuery } from '@tanstack/react-query';
import { getChannelsOverPeer } from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '../auth/useOdinClientContext';

interface useSocialChannelsProps {
  odinId?: string;
}

export const useSocialChannels = ({ odinId }: useSocialChannelsProps) => {
  const odinClient = useOdinClientContext();

  const fetch = async ({ odinId }: useSocialChannelsProps) => {
    if (!odinId) {
      return;
    }
    return await getChannelsOverPeer(odinClient, odinId);
  };

  return {
    fetch: useQuery({
      queryKey: ['peer-channels', odinId],
      queryFn: () => fetch({ odinId }),
      enabled: !!odinId,
      staleTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
    }),
  };
};
