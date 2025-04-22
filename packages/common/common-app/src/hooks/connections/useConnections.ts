import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { NumberCursoredResult, PagedResult } from '@homebase-id/js-lib/core';
import {
  DotYouProfile,
  getConnections,
  getPendingRequests,
  getReceivedIntroductions,
  removeAllReceivedIntroductions,
  getSentRequests,
  IncomingConnectionRequest,
  ConnectionRequest,
  ActiveConnection,
} from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const usePendingConnections = () => {
  const odinClient = useOdinClientContext();
  const pageSize = 6;

  const fetchPendingConnections = async ({ pageNumber }: { pageNumber: number }) => {
    return (
      (await getPendingRequests(odinClient, {
        pageNumber: pageNumber,
        pageSize,
      })) || null
    );
  };

  return {
    fetch: useInfiniteQuery({
      initialPageParam: 1 as number,
      queryKey: ['pending-connections'],
      queryFn: ({ pageParam }) => fetchPendingConnections({ pageNumber: pageParam }),
      getNextPageParam: (_lastPage, _pages, lastPageParam) => lastPageParam + 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }),
  };
};

export const invalidatePendingConnections = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
};

export const invalidatePendingConnection = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['pending-connection'] });
};

export const updateCachePendingConnections = (
  queryClient: QueryClient,
  transformFn: (
    data: InfiniteData<PagedResult<IncomingConnectionRequest>>
  ) => InfiniteData<PagedResult<IncomingConnectionRequest>> | undefined
) => {
  const queryData = queryClient.getQueryData<InfiniteData<PagedResult<IncomingConnectionRequest>>>([
    'pending-connections',
  ]);
  if (!queryData || !queryData?.pages?.length) return;

  const newQueryData = transformFn(queryData);
  if (newQueryData) {
    queryClient.setQueryData(['pending-connections'], newQueryData);
  }
  return queryData;
};

interface useSentConnectionsProps {
  includeIntroductions?: true | false | 'only';
}
export const useSentConnections = (props?: useSentConnectionsProps) => {
  const { includeIntroductions } = props || {};
  const odinClient = useOdinClientContext();
  const pageSize = 6;

  const fetchSentRequests = async ({ pageNumber }: { pageNumber: number }) =>
    await getSentRequests(odinClient, {
      pageNumber: pageNumber,
      pageSize: pageSize,
    });

  return {
    fetch: useInfiniteQuery<
      PagedResult<ConnectionRequest>,
      Error,
      InfiniteData<PagedResult<ConnectionRequest>, unknown>,
      QueryKey,
      number
    >({
      queryKey: ['sent-requests'],
      initialPageParam: 1 as number,
      getNextPageParam: (_lastPage, _allPages, lastPageParam) => lastPageParam + 1,
      queryFn: ({ pageParam }) => fetchSentRequests({ pageNumber: pageParam }),
      refetchOnWindowFocus: false,
      select:
        includeIntroductions !== true
          ? (data) => {
            if (includeIntroductions === 'only') {
              return {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  results: page.results.filter((result) => result.introducerOdinId),
                })),
              };
            } else {
              return {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  results: page.results.filter((result) => !result.introducerOdinId),
                })),
              };
            }
          }
          : undefined,
    }),
  };
};

export const invalidateSentConnections = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
};

export const updateCacheSentConnections = (
  queryClient: QueryClient,
  transformFn: (
    data: InfiniteData<PagedResult<ConnectionRequest>>
  ) => InfiniteData<PagedResult<ConnectionRequest>> | undefined
) => {
  const queryData = queryClient.getQueryData<InfiniteData<PagedResult<ConnectionRequest>>>([
    'sent-requests',
  ]);
  if (!queryData || !queryData?.pages?.length) return;

  const newQueryData = transformFn(queryData);
  if (newQueryData) {
    queryClient.setQueryData(['sent-requests'], newQueryData);
  }
  return queryData;
};

export const useReceivedIntroductions = () => {
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();

  const fetchIncomingIntroductions = async () => {
    return await getReceivedIntroductions(odinClient);
  };

  return {
    fetch: useQuery({
      queryKey: ['received-introductions'],
      queryFn: () => fetchIncomingIntroductions(),
      refetchOnWindowFocus: false,
    }),
    deleteAll: useMutation({
      mutationFn: () => removeAllReceivedIntroductions(odinClient),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['received-introductions'] });
      },
    }),
  };
};

interface useActiveConnectionsProps {
  pageSize: number;
}

export const useActiveConnections = (
  { pageSize }: useActiveConnectionsProps = {
    pageSize: 10,
  }
) => {
  const odinClient = useOdinClientContext();

  const fetchConnections = async (
    { pageSize, cursor }: { pageSize: number; cursor?: unknown } = {
      pageSize: 10,
    }
  ) => {
    try {
      return await getConnections(odinClient, {
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

export const updateCacheActiveConnections = (
  queryClient: QueryClient,
  transformFn: (
    data: InfiniteData<NumberCursoredResult<DotYouProfile>>
  ) => InfiniteData<NumberCursoredResult<DotYouProfile>> | undefined
) => {
  const queries = queryClient.getQueriesData<InfiniteData<NumberCursoredResult<DotYouProfile>>>({
    queryKey: ['active-connections'],
    exact: false,
  });
  queries.forEach(([queryKey, queryData]) => {
    if (!queryData || !queryData?.pages?.length) return;

    const newQueryData = transformFn(queryData);
    if (newQueryData) {
      queryClient.setQueryData(queryKey, newQueryData);
    }
  });
};
