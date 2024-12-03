import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIdentityIFollow, Unfollow, UnfollowRequest } from '@homebase-id/js-lib/network';
import { invalidateFollowing } from './useFollowing';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

type useIdentityIFollowProps = {
  odinId?: string;
};

export const useIdentityIFollow = ({ odinId }: useIdentityIFollowProps) => {
  const dotYouClient = useDotYouClientContext();
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
      staleTime: 1000 * 60 * 60, // 1 hour
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
