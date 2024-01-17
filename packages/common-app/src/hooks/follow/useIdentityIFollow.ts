import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIdentityIFollow, Unfollow, UnfollowRequest } from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

type useIdentityIFollowProps = {
  odinId?: string;
};

export const useIdentityIFollow = ({ odinId }: useIdentityIFollowProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
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
    fetch: useQuery({
      queryKey: ['following', odinId],
      queryFn: () => fetchBlogData({ odinId: odinId as string }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId,
    }),
    unfollow: useMutation({
      mutationFn: unfollow,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['following'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
