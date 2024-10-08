import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFollowers } from '@homebase-id/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

const PAGE_SIZE = 30;
export const useFollowerInfinite = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
