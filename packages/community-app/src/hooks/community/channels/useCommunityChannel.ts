import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { getCommunityChannel } from '../../../providers/CommunityProvider';

export const useCommunityChannel = (props?: { communityId?: string; channelId?: string }) => {
  const { communityId, channelId } = props || {};
  const dotYouClient = useDotYouClientContext();

  const fetchChannel = async (communityId: string, channelId: string) => {
    return await getCommunityChannel(dotYouClient, communityId, channelId);
  };

  return {
    fetch: useQuery({
      queryKey: ['community-channel', communityId, channelId],
      queryFn: async () => fetchChannel(communityId as string, channelId as string),
      enabled: !!communityId && !!channelId,
    }),
  };
};
