import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  disconnectFromDomain,
  getDomainClients,
  restoreDomainAccess,
  revokeDomainAccess,
} from '../../provider/network/domainNetwork/DomainManager';
import { invalidateDomainInfo, invalidateDomains } from '@homebase-id/common-app';

export const useManageDomain = ({ domain }: { domain?: string }) => {
  const queryClient = useQueryClient();

  const dotYouClient = useAuth().getDotYouClient();

  const fetchClients = async ({ domain }: { domain: string }) => {
    if (!domain) return;

    return await getDomainClients(dotYouClient, domain);
  };

  const revokeDomain = async ({ domain }: { domain: string }) =>
    await revokeDomainAccess(dotYouClient, domain);

  const restoreDomain = async ({ domain }: { domain: string }) =>
    await restoreDomainAccess(dotYouClient, domain);

  const removeDomain = async ({ domain }: { domain: string }) =>
    await disconnectFromDomain(dotYouClient, domain);

  return {
    fetchClients: useQuery({
      queryKey: ['domain-clients', domain],
      queryFn: () => fetchClients({ domain: domain as string }),

      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    revokeDomain: useMutation({
      mutationFn: revokeDomain,
      onSuccess: (data, param) => {
        invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    restoreDomain: useMutation({
      mutationFn: restoreDomain,
      onSuccess: (data, param) => {
        invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    disconnect: useMutation({
      mutationFn: removeDomain,
      onSuccess: (data, param) => {
        invalidateDomains(queryClient);
        invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
