import { useQuery } from '@tanstack/react-query';
import { getPostOverTransit } from '@youfoundation/js-lib';
import { useDotYouClient } from '../../..';

interface useSocialPostProps {
  odinId?: string;
  channelId?: string;
  postId?: string;
}

const useSocialPost = ({ odinId, channelId, postId }: useSocialPostProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({ odinId, channelId, postId }: useSocialPostProps) => {
    if (!odinId || !channelId || !postId) {
      return;
    }

    return await getPostOverTransit(dotYouClient, odinId, channelId, postId);
  };

  return {
    fetch: useQuery(
      ['post', odinId, channelId, postId],
      () => fetch({ odinId, channelId, postId }),
      {
        enabled: !!odinId && !!channelId && !!postId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      }
    ),
  };
};

export default useSocialPost;
