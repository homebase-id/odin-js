import { useQuery } from '@tanstack/react-query';
import { DotYouClient, ApiType, getChannelOverTransit, BlogConfig } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

interface useSocialChannelProps {
  odinId?: string;
  channelId?: string;
}

const useSocialChannel = ({ odinId, channelId }: useSocialChannelProps) => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetch = async ({ odinId, channelId }: useSocialChannelProps) => {
    if (!odinId || !channelId) {
      return;
    }

    // Optimization to not fetch similar content, might break if the public channel is adapted by the user... Perhaps we should always keep the slug?
    if (channelId === BlogConfig.PublicChannel.channelId) {
      return BlogConfig.PublicChannel;
    }

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

export default useSocialChannel;
