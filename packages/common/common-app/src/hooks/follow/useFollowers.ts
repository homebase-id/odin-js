import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFollowers } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

const PAGE_SIZE = 30;
export const useFollowerInfinite = () => {
  const dotYouClient = useDotYouClientContext();

  const fetch = async ({ pageParam }: { pageParam?: string }) => {
    const response = await fetchFollowers(dotYouClient, pageParam, PAGE_SIZE);
    return response;
  };

  return useInfiniteQuery({
    queryKey: ['followers'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetch({ pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage?.results && lastPage.results.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
