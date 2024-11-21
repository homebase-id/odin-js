import { QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useDotYouClient } from '@homebase-id/common-app';
import { getDomains } from '../../provider/network/domainNetwork/DomainProvider';

interface useActiveDomainsProps {
  pageSize: number;
  cursor?: number;
}

export const useDomains = (
  { pageSize: activePageSize, cursor: activePage }: useActiveDomainsProps = {
    pageSize: 10,
  }
) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchDomains = async (
    { pageSize, cursor }: { pageSize: number; cursor?: number } = {
      pageSize: 10,
    }
  ) => {
    try {
      return await getDomains(dotYouClient, {
        cursor: cursor ?? 0,
        count: pageSize,
      });
    } catch (ex) {
      console.warn('[useDomains] Failed to fetch domains', ex);
      return {
        cursor: undefined,
        results: [],
      };
    }
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['active-domains', activePageSize, activePage],
      queryFn: ({ pageParam }) => fetchDomains({ pageSize: activePageSize, cursor: pageParam }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= activePageSize ? lastPage.cursor : undefined,
      refetchOnWindowFocus: false,
    }),
  };
};

export const invalidateDomains = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['active-domains'] });
};
