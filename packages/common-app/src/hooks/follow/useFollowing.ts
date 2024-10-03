import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrUpdateFollow, fetchFollowing, FollowRequest } from '@homebase-id/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

const PAGE_SIZE = 30;
export const useFollowingInfinite = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchFollowingInternal = async ({ pageParam }: { pageParam?: string }) => {
    try {
      const response = await fetchFollowing(dotYouClient, pageParam, PAGE_SIZE);
      if (response) return response;
    } catch (ex) {
      console.error('Failed to fetch following', ex);
      //
    }
    return {
      results: [],
      cursorState: '',
    };
  };

  const createOrUpdateFollowInternal = async (request: FollowRequest) => {
    return await createOrUpdateFollow(dotYouClient, request);
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['following'],
      queryFn: ({ pageParam }) => fetchFollowingInternal({ pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        (lastPage?.results?.length &&
          lastPage?.results?.length >= PAGE_SIZE &&
          lastPage?.cursorState) ||
        undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
    follow: useMutation({
      mutationFn: createOrUpdateFollowInternal,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['following'] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
