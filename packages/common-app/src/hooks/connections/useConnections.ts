import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  PagingOptions,
  getConnections,
  getPendingRequests,
  getSentRequests,
} from '@youfoundation/js-lib';

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
    return await await getPendingRequests(dotYouClient, {
      pageNumber: pageNumber,
      pageSize: pageSize,
    });
  };

  return {
    fetch: useQuery(
      ['pendingConnections', pendingPageSize, pendingPage],
      () => fetchPendingConnections({ pageSize: pendingPageSize, pageNumber: pendingPage }),
      {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        keepPreviousData: true,
        onError: (err) => console.error(err),
        enabled: !!pendingPage,
      }
    ),
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
    fetch: useQuery(
      ['sentRequests', sentPageSize, sentPage],
      () => fetchSentRequests({ pageSize: sentPageSize, pageNumber: sentPage }),
      {
        refetchOnWindowFocus: false,
        keepPreviousData: true,
        onError: (err) => console.error(err),
        enabled: !!sentPage,
      }
    ),
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
        cursor: cursor ?? 0,
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
    fetch: useInfiniteQuery(
      ['activeConnections', activePageSize, activePage],
      ({ pageParam }) => fetchConnections({ pageSize: activePageSize, cursor: pageParam }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage.results?.length >= activePageSize && lastPage.cursor) ?? undefined,
        refetchOnWindowFocus: false,
        keepPreviousData: true,
        onError: (err) => console.error(err),
      }
    ),
  };
};
