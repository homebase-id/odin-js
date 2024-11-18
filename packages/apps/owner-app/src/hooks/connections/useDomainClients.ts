import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  getDomainClients,
  removeDomainClient,
} from '../../provider/network/domainNetwork/DomainManager';

export const useDomainClients = ({ domain }: { domain?: string }) => {
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const fetchClients = async ({ domain }: { domain: string }) => {
    if (!domain) return;

    return await getDomainClients(dotYouClient, domain);
  };

  const removeClient = async ({
    domain,
    registrationId,
  }: {
    domain: string;
    registrationId: string;
  }) => {
    return await removeDomainClient(dotYouClient, domain, registrationId);
  };

  return {
    fetch: useQuery({
      queryKey: ['domain-clients', domain],
      queryFn: () => fetchClients({ domain: domain as string }),
      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    removeClient: useMutation({
      mutationFn: removeClient,
      onSuccess: (data, param) => {
        invalidateDomainClients(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export const invalidateDomainClients = (queryClient: QueryClient, domain?: string | undefined) => {
  queryClient.invalidateQueries({
    queryKey: ['domain-clients', domain],
    exact: !!domain,
  });
};
