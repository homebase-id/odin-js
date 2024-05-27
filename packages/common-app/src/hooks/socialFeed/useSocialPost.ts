import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { RecentsFromConnectionsReturn, getPostOverPeer } from '@youfoundation/js-lib/peer';
import { useDotYouClient } from '../auth/useDotYouClient';

interface useSocialPostProps {
  odinId?: string;
  channelId?: string;
  postId?: string;
}

export const useSocialPost = ({ odinId, channelId, postId }: useSocialPostProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async ({ odinId, channelId, postId }: useSocialPostProps) => {
    if (!odinId || !channelId || !postId) return;

    // Check if the post is already in the social feed cache
    const socialFeedCache = queryClient.getQueryData<InfiniteData<RecentsFromConnectionsReturn>>([
      'social-feeds',
    ]);
    for (let i = 0; socialFeedCache && i < socialFeedCache.pages.length; i++) {
      const page = socialFeedCache.pages[i];
      const post = page.results.find((x) => x.fileMetadata.appData.content.id === postId);
      if (post) return post;
    }

    return await getPostOverPeer(dotYouClient, odinId, channelId, postId);
  };

  return {
    fetch: useQuery({
      queryKey: ['post', odinId, channelId, postId],
      queryFn: () => fetch({ odinId, channelId, postId }),
      enabled: !!odinId && !!channelId && !!postId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  };
};
