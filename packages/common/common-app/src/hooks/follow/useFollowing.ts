import { QueryClient, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrUpdateFollow, fetchFollowing, FollowRequest } from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '../auth/useOdinClientContext';

const PAGE_SIZE = 30;
export const useFollowingInfinite = () => {
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();

  const fetchFollowingInternal = async ({ pageParam }: { pageParam?: string }) => {
    try {
      const response = await fetchFollowing(odinClient, pageParam, PAGE_SIZE);
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

  const createOrUpdateFollowInternal = async ({
    request,
    includeHistory,
  }: {
    request: FollowRequest;
    includeHistory?: boolean;
  }) => await createOrUpdateFollow(odinClient, request, includeHistory);

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
      staleTime: 1000 * 60 * 60, // 1 hour
    }),
    follow: useMutation({
      mutationFn: createOrUpdateFollowInternal,
      onSuccess: () => {
        invalidateFollowing(queryClient);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export const invalidateFollowing = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({ queryKey: ['following'] });
};
