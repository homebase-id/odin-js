import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFollowers } from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

type useFollowerInfiniteProps = {
  pageSize?: number;
};

export const useFollowerInfinite = ({ pageSize = 30 }: useFollowerInfiniteProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchBlogData = async ({ pageParam }: { pageParam?: string }) => {
    const response = await fetchFollowers(dotYouClient, pageParam, pageSize);
    return response;
  };

  return useInfiniteQuery({
    queryKey: ['followers'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchBlogData({ pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage?.results && lastPage.results.length >= pageSize ? lastPage.cursorState : undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
