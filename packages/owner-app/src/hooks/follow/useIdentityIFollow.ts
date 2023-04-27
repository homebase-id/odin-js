import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIdentityIFollow, Unfollow, UnfollowRequest } from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

type useIdentityIFollowProps = {
  odinId?: string;
};

const useIdentityIFollow = ({ odinId }: useIdentityIFollowProps) => {
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const fetchBlogData = async ({ odinId }: { odinId: string }) => {
    const response = await fetchIdentityIFollow(dotYouClient, odinId);
    return response;
  };

  const unfollow = async (request: UnfollowRequest) => {
    const response = await Unfollow(dotYouClient, request);
    return response;
  };

  return {
    fetch: useQuery(['following', odinId], () => fetchBlogData({ odinId: odinId as string }), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId,
    }),
    unfollow: useMutation(unfollow, {
      onSuccess: () => {
        queryClient.invalidateQueries(['following']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useIdentityIFollow;
