import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NumberCursoredResult, PagingOptions } from '@homebase-id/js-lib/core';
import {
  DotYouProfile,
  getConnections,
  getPendingRequests,
  getReceivedIntroductions,
  removeAllReceivedIntroductions,
  getSentRequests,
} from '@homebase-id/js-lib/network';

import { useDotYouClient } from '../auth/useDotYouClient';

interface useConnectionsProps {
  pageSize: number;
  pageNumber: number;
}

type usePendingConnectionsProps = useConnectionsProps;
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
      queryKey: ['pending-connections', pendingPageSize, pendingPage],
      queryFn: () =>
        fetchPendingConnections({ pageSize: pendingPageSize, pageNumber: pendingPage }),

      refetchOnWindowFocus: false,
      refetchOnMount: true,
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
      queryKey: ['sent-requests', sentPageSize, sentPage],
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

export const useReceivedIntroductions = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchIncomingIntroductions = async () => {
    return await getReceivedIntroductions(dotYouClient);
  };

  return {
    fetch: useQuery({
      queryKey: ['received-introductions'],
      queryFn: () => fetchIncomingIntroductions(),
      refetchOnWindowFocus: false,
    }),
    deleteAll: useMutation({
      mutationFn: () => removeAllReceivedIntroductions(dotYouClient),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['received-introductions'] });
      },
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