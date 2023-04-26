import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, getPendingRequests } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const usePendingConnections = (
  { pageSize, pageNumber }: { pageSize: number; pageNumber: number } = {
    pageSize: 10,
    pageNumber: 1,
  }
) => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchPendingConnections = async (
    {
      pageSize,
      pageNumber,
    }: {
      pageSize: number;
      pageNumber: number;
    } = { pageSize: 10, pageNumber: 1 }
  ) => {
    try {
      return await getPendingRequests(dotYouClient, {
        pageNumber: pageNumber,
        pageSize: pageSize,
      });
    } catch (ex) {
      return;
    }
  };

  return {
    fetchPending: useQuery(
      ['pendingConnections', pageNumber ?? 1, pageSize],
      () => fetchPendingConnections({ pageSize, pageNumber }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
      }
    ),
  };
};

export default usePendingConnections;
