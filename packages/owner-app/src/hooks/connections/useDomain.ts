import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  disconnectFromDomain,
  getDomainClients,
  getDomainInfo,
  restoreDomainAccess,
  revokeDomainAccess,
} from '../../provider/network/domainNetwork/DomainProvider';

export const useDomain = ({ domain }: { domain?: string }) => {
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
    fetch: useQuery({
      queryKey: ['domainInfo', domain],
      queryFn: () => fetchSingle({ domain: domain as string }),
      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    fetchClients: useQuery({
      queryKey: ['domainClients', domain],
      queryFn: () => fetchClients({ domain: domain as string }),

      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    revokeDomain: useMutation({
      mutationFn: revokeDomain,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['domainInfo', param.domain] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    restoreDomain: useMutation({
      mutationFn: restoreDomain,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['domainInfo', param.domain] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    disconnect: useMutation({
      mutationFn: removeDomain,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['activeDomains'] });
        queryClient.invalidateQueries({ queryKey: ['domainInfo', param.domain] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
