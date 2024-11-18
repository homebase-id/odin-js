import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIdentityIFollow, Unfollow, UnfollowRequest } from '@homebase-id/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';
import { invalidateFollowing } from './useFollowing';

type useIdentityIFollowProps = {
  odinId?: string;
};

export const useIdentityIFollow = ({ odinId }: useIdentityIFollowProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async ({ odinId }: { odinId: string }) => {
    const response = await fetchIdentityIFollow(dotYouClient, odinId);
    return response;
  };

  const unfollow = async (request: UnfollowRequest) => {
    const response = await Unfollow(dotYouClient, request);
    return response;
  };

  return {
    fetch: useQuery({
      queryKey: ['identity-following', odinId],
      queryFn: () => fetch({ odinId: odinId as string }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId,
    }),
    unfollow: useMutation({
      mutationFn: unfollow,
      onSuccess: () => {
        invalidateFollowing(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
