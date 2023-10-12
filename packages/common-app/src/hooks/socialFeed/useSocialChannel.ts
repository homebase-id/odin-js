import { useQuery } from '@tanstack/react-query';
import { BlogConfig } from '@youfoundation/js-lib/public';
import { getChannelOverTransit } from '@youfoundation/js-lib/transit';
import { useDotYouClient } from '../../..';

interface useSocialChannelProps {
  odinId?: string;
  channelId?: string;
}

export const useSocialChannel = ({ odinId, channelId }: useSocialChannelProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({ odinId, channelId }: useSocialChannelProps) => {
    if (!odinId || !channelId) return;

    // Optimization to not fetch similar content, might break if the public channel is adapted by the user... Perhaps we should always keep the slug?
    if (channelId === BlogConfig.PublicChannel.channelId) return BlogConfig.PublicChannel;

    return await getChannelOverTransit(dotYouClient, odinId, channelId);
  };

  return {
    fetch: useQuery(['channel', odinId, channelId], () => fetch({ odinId, channelId }), {
      enabled: !!odinId && !!channelId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  };
};
