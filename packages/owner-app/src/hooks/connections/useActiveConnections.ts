import { useInfiniteQuery } from '@tanstack/react-query';
import { getConnections } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

interface useActiveConnectionsProps {
  active: { pageSize: number; cursor?: number };
}

const useConnections = (
  { active: { pageSize: activePageSize, cursor: activePage } }: useActiveConnectionsProps = {
    active: { pageSize: 10 },
  }
) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchConnections = async (
    { pageSize, cursor }: { pageSize: number; cursor?: number } = {
      pageSize: 10,
    }
  ) => {
    return await getConnections(dotYouClient, {
      cursor: cursor ?? 0,
      count: pageSize,
    });
  };

  return {
    fetchActive: useInfiniteQuery(
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

export default useConnections;
