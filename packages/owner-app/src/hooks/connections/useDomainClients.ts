import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import {
  getDomainClients,
  removeDomainClient,
} from '../../provider/network/domainNetwork/DomainProvider';

const useDomainClients = ({ domain }: { domain?: string }) => {
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
    fetch: useQuery(['domainClients', domain], () => fetchClients({ domain: domain as string }), {
      refetchOnWindowFocus: false,
      enabled: !!domain,
    }),

    removeClient: useMutation(removeClient, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['domainClients', param.domain]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useDomainClients;
