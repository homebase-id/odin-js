import { useInfiniteQuery, QueryClient } from '@tanstack/react-query';
import { NumberCursoredResult } from '@homebase-id/js-lib/core';
import { getConnections, ActiveConnection } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

interface useActiveConnectionsProps {
  pageSize: number;
}

export const useActiveConnections = (
  { pageSize }: useActiveConnectionsProps = {
    pageSize: 10,
  }
) => {
  const dotYouClient = useDotYouClientContext();

  const fetchConnections = async (
    { pageSize, cursor }: { pageSize: number; cursor?: unknown } = {
      pageSize: 10,
    }
  ) => {
    try {
      return await getConnections(dotYouClient, {
        cursor: cursor ?? undefined,
        count: pageSize,
      });
    } catch (ex) {
      console.warn('[useActiveConnections] Failed to fetch connections', ex);
      return {
        cursor: 0,
        results: [],
      } as NumberCursoredResult<ActiveConnection>;
    }
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['active-connections', pageSize],
      initialPageParam: undefined as unknown | undefined,
      queryFn: ({ pageParam }) => fetchConnections({ pageSize: pageSize, cursor: pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= pageSize && lastPage.cursor !== 0 ? lastPage.cursor : undefined,
      refetchOnWindowFocus: false,
    }),
  };
};

export const invalidateActiveConnections = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['active-connections'], exact: false });
};
