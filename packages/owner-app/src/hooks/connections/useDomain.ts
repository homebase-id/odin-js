import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import { disconnectFromDomain, getDomainInfo } from '@youfoundation/js-lib/network';

const useDomain = ({ domain }: { domain?: string }) => {
  const queryClient = useQueryClient();

  const dotYouClient = useAuth().getDotYouClient();

  const fetchSingle = async ({ domain }: { domain: string }) => {
    if (!domain) return;

    return await getDomainInfo(dotYouClient, domain);
  };

  const disconnect = async ({ domain }: { domain: string }) => {
    return await disconnectFromDomain(dotYouClient, domain);
  };

  return {
    fetch: useQuery(['domainInfo', domain], () => fetchSingle({ domain: domain as string }), {
      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    disconnect: useMutation(disconnect, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['activeDomains']);
        queryClient.invalidateQueries(['domainInfo', param.domain]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useDomain;
