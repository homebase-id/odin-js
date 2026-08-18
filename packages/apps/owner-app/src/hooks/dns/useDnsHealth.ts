import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getDnsHealth } from '../../provider/dns/DnsHealthProvider';

export const useDnsHealth = () => {
  const dotYouClient = useDotYouClientContext();

  return {
    fetchDnsHealth: useQuery({
      queryKey: ['dns-health'],
      queryFn: () => getDnsHealth(dotYouClient),
      // The check runs a series of live authoritative DNS lookups server-side; no
      // background polling - the panel's Verify button refetches on demand
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }),
  };
};
