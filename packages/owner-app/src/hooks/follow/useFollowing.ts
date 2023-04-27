import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFollowing, FollowRequest, createOrUpdateFollow } from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

type useFollowingInfiniteProps = {
  pageSize?: number;
};

const useFollowingInfinite = ({ pageSize = 30 }: useFollowingInfiniteProps) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const fetchBlogData = async ({ pageParam }: { pageParam?: string }) => {
    const response = await fetchFollowing(dotYouClient, pageParam);
    return response;
  };

  const createOrUpdateFollowInternal = async (request: FollowRequest) => {
    const response = await createOrUpdateFollow(dotYouClient, request);
    return response;
  };

  return {
    fetch: useInfiniteQuery(['following'], ({ pageParam }) => fetchBlogData({ pageParam }), {
      getNextPageParam: (lastPage) =>
        (lastPage?.results && lastPage.results.length >= pageSize && lastPage?.cursorState) ??
        undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
    follow: useMutation(createOrUpdateFollowInternal, {
      onSuccess: () => {
        queryClient.invalidateQueries(['following']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useFollowingInfinite;
