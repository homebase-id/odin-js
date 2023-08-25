import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import {
  disconnectFromDomain,
  getDomainClients,
  getDomainInfo,
  revokeDomainAccess,
  restoreDomainAccess,
} from '@youfoundation/js-lib/network';

const useDomain = ({ domain }: { domain?: string }) => {
  const queryClient = useQueryClient();

  const dotYouClient = useAuth().getDotYouClient();

  const fetchSingle = async ({ domain }: { domain: string }) => {
    if (!domain) return;

    return await getDomainInfo(dotYouClient, domain);
  };

  const fetchClients = async ({ domain }: { domain: string }) => {
    if (!domain) return;

    return await getDomainClients(dotYouClient, domain);
  };

  const revokeDomain = async ({ domain }: { domain: string }) => {
    return await revokeDomainAccess(dotYouClient, domain);
  };

  const restoreDomain = async ({ domain }: { domain: string }) => {
    return await restoreDomainAccess(dotYouClient, domain);
  };

  const removeDomain = async ({ domain }: { domain: string }) => {
    return await disconnectFromDomain(dotYouClient, domain);
  };

  return {
    fetch: useQuery(['domainInfo', domain], () => fetchSingle({ domain: domain as string }), {
      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    fetchClients: useQuery(
      ['domainClients', domain],
      () => fetchClients({ domain: domain as string }),
      {
        refetchOnWindowFocus: false,
        enabled: !!domain,
      }
    ),

    revokeDomain: useMutation(revokeDomain, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['domainInfo', param.domain]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    restoreDomain: useMutation(restoreDomain, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['domainInfo', param.domain]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    disconnect: useMutation(removeDomain, {
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
