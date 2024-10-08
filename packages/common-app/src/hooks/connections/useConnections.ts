import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { NumberCursoredResult, PagingOptions } from '@homebase-id/js-lib/core';
import {
  DotYouProfile,
  getConnections,
  getPendingRequests,
  getSentRequests,
} from '@homebase-id/js-lib/network';

import { useDotYouClient } from '../auth/useDotYouClient';

interface useConnectionsProps {
  pageSize: number;
  pageNumber: number;
}

export const usePendingConnections = ({
  pageSize: pendingPageSize,
  pageNumber: pendingPage,
}: useConnectionsProps) => {
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
      queryKey: ['pending-connections', pendingPageSize, pendingPage],
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
}: useConnectionsProps) => {
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
      queryKey: ['sent-requests', sentPageSize, sentPage],
      queryFn: () => fetchSentRequests({ pageSize: sentPageSize, pageNumber: sentPage }),
      refetchOnWindowFocus: false,
      enabled: !!sentPage,
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
      console.warn('[useActiveConnections] Failed to fetch connections', ex);
      return {
        cursor: 0,
        results: [],
      } as NumberCursoredResult<DotYouProfile>;
    }
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['active-connections', activePageSize, activePage],
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
