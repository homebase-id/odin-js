import { QueryClient, useQuery } from '@tanstack/react-query';
import { getDomainInfo } from '../../provider/network/domainNetwork/DomainProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useDomain = ({ domain }: { domain?: string }) => {
  const dotYouClient = useDotYouClientContext();

  const fetchSingle = async ({ domain }: { domain: string }) => {
    if (!domain) return;

    return await getDomainInfo(dotYouClient, domain);
  };
  return {
    fetch: useQuery({
      queryKey: ['domain-info', domain],
      queryFn: () => fetchSingle({ domain: domain as string }),
      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),
  };
};

export const invalidateDomainInfo = (queryClient: QueryClient, domain: string) => {
  queryClient.invalidateQueries({ queryKey: ['domain-info', domain] });
};
