import { useInfiniteQuery } from '@tanstack/react-query';
import { DotYouClient, getConnections } from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

const useConnections = ({ pageSize, cursor }: { pageSize: number; cursor?: number }) => {
  const dotYouClient = useAuth().getDotYouClient();
  const fetchConnections = async ({ pageSize, cursor }: { pageSize: number; cursor?: number }) => {
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
      ['connections', cursor ?? 1, pageSize],
      () => fetchConnections({ pageSize, cursor }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage.results?.length >= pageSize && lastPage.cursor) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
      }
    ),
  };
};

export default useConnections;
