import { QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getDomains } from '../../provider/network/domainNetwork/DomainProvider';

interface useActiveDomainsProps {
  pageSize: number;
  cursor?: unknown;
}

export const useDomains = (
  { pageSize: activePageSize, cursor: activePage }: useActiveDomainsProps = {
    pageSize: 10,
  }
) => {
  const dotYouClient = useDotYouClientContext();

  const fetchDomains = async (
    { pageSize, cursor }: { pageSize: number; cursor?: unknown } = {
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
      initialPageParam: undefined as unknown | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= activePageSize ? lastPage.cursor : undefined,
      refetchOnWindowFocus: false,
    }),
  };
};

export const invalidateDomains = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['active-domains'] });
};
