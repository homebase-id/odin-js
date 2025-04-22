import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIdentityIFollow, Unfollow, UnfollowRequest } from '@homebase-id/js-lib/network';
import { invalidateFollowing } from './useFollowing';
import { useOdinClientContext } from '../auth/useOdinClientContext';

type useIdentityIFollowProps = {
  odinId?: string;
};

export const useIdentityIFollow = ({ odinId }: useIdentityIFollowProps) => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const fetch = async ({ odinId }: { odinId: string }) => {
    const response = await fetchIdentityIFollow(odinClient, odinId);
    return response;
  };

  const unfollow = async (request: UnfollowRequest) => {
    const response = await Unfollow(odinClient, request);
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
