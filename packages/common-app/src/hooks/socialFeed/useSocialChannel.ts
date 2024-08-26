import { useQuery } from '@tanstack/react-query';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { getChannelOverPeer } from '@homebase-id/js-lib/peer';
import { useDotYouClient } from '../auth/useDotYouClient';

interface useSocialChannelProps {
  odinId?: string;
  channelId?: string;
}

export const useSocialChannel = ({ odinId, channelId }: useSocialChannelProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({ odinId, channelId }: useSocialChannelProps) => {
    if (!odinId || !channelId) return;

    // Optimization to not fetch similar content, might break if the public channel is adapted by the user... Perhaps we should always keep the slug?
    if (channelId === BlogConfig.PublicChannelId) return BlogConfig.PublicChannelNewDsr;

    return (await getChannelOverPeer(dotYouClient, odinId, channelId)) || null;
  };

  return {
    fetch: useQuery({
      queryKey: ['channel', odinId, channelId],
      queryFn: () => fetch({ odinId, channelId }),
      enabled: !!odinId && !!channelId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  };
};
