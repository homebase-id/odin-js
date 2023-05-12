import { useQuery } from '@tanstack/react-query';
import { PagingOptions, getPendingRequests, getSentRequests } from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

interface useConnectionsProps {
  pageSize: number;
  pageNumber: number;
}

export const usePendingConnections = ({
  pageSize: pendingPageSize,
  pageNumber: pendingPage,
}: useConnectionsProps) => {
  const dotYouClient = useAuth().getDotYouClient();

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
  const dotYouClient = useAuth().getDotYouClient();

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
