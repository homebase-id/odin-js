import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { getCommunityChannels } from '../../../providers/CommunityProvider';

export const useCommunityChannels = (props: { communityId?: string }) => {
  const { communityId } = props;
  const dotYouClient = useDotYouClientContext();

  const fetchChannels = async (communityId: string) => {
    return await getCommunityChannels(dotYouClient, communityId);
  };

  return {
    fetch: useQuery({
      queryKey: ['community-channels', communityId],
      queryFn: async () => fetchChannels(communityId as string),
      enabled: !!communityId,
    }),
  };
};
