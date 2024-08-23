import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { PagingOptions } from '@youfoundation/js-lib/core';
import { getConnections, getPendingRequests, getSentRequests } from '@youfoundation/js-lib/network';

import { useDotYouClient } from '../auth/useDotYouClient';

interface useConnectionsProps {
  pageSize: number;
  pageNumber: number;
}

interface usePendingConnectionsProps extends useConnectionsProps {}
interface useSentConnectionsProps extends useConnectionsProps {
  includeIntroductions?: true | false | 'only';
}

export const usePendingConnections = ({
  pageSize: pendingPageSize,
  pageNumber: pendingPage,
}: usePendingConnectionsProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchPendingConnections = async (
    { pageSize, pageNumber }: PagingOptions = { pageSize: 10, pageNumber: 1 }
  ) => {
    return (
      (await getPendingRequests(dotYouClient, {
        pageNumber: pageNumber,
        pageSize: pageSize,
      })) || null
    );
  };

  return {
    fetch: useQuery({
      queryKey: ['pendingConnections', pendingPageSize, pendingPage],
      queryFn: () =>
        fetchPendingConnections({ pageSize: pendingPageSize, pageNumber: pendingPage }),

      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: !!pendingPage,
    }),
  };
};

export const useSentConnections = ({
  pageSize: sentPageSize,
  pageNumber: sentPage,
  includeIntroductions,
}: useSentConnectionsProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchSentRequests = async (
    { pageSize, pageNumber }: PagingOptions = { pageSize: 10, pageNumber: 1 }
  ) => {
    return await await getSentRequests(dotYouClient, {
      pageNumber: pageNumber,
      pageSize: pageSize,
    });
  };

  return {
    fetch: useQuery({
      queryKey: ['sentRequests', sentPageSize, sentPage],
      queryFn: () => fetchSentRequests({ pageSize: sentPageSize, pageNumber: sentPage }),
      refetchOnWindowFocus: false,
      enabled: !!sentPage,
      select:
        includeIntroductions !== true
          ? (data) => {
              if (includeIntroductions === 'only') {
                return {
                  ...data,
                  results: data.results.filter((result) => result.introducerOdinId),
                };
              } else if (includeIntroductions === false) {
                return {
                  ...data,
                  results: data.results.filter((result) => !result.introducerOdinId),
                };
              }
              return data;
            }
          : undefined,
    }),
  };
};

interface useActiveConnectionsProps {
  pageSize: number;
  cursor?: number;
}

export const useActiveConnections = (
  { pageSize: activePageSize, cursor: activePage }: useActiveConnectionsProps = {
    pageSize: 10,
  }
) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchConnections = async (
    { pageSize, cursor }: { pageSize: number; cursor?: number } = {
      pageSize: 10,
    }
  ) => {
    try {
      return await getConnections(dotYouClient, {
        cursor: cursor ?? undefined,
        count: pageSize,
      });
    } catch (ex) {
      return {
        cursor: undefined,
        results: [],
      };
    }
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['activeConnections', activePageSize, activePage],
      initialPageParam: undefined as number | undefined,
      queryFn: ({ pageParam }) => fetchConnections({ pageSize: activePageSize, cursor: pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= activePageSize && lastPage.cursor !== 0
          ? lastPage.cursor
          : undefined,
      refetchOnWindowFocus: false,
    }),
  };
};
