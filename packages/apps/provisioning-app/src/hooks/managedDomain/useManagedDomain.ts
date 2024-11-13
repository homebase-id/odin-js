import axios, { AxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';

const root = '//' + window.location.host + '/api/registration/v1';

export type ManagedDomainProvisionState =
  | 'EnteringDetails'
  | 'CreatingManagedDomain'
  | 'Provisioning'
  | 'Failed';

//

export interface ManagedDomainApex {
  apex: string;
  prefixLabels: string[];
}

//

export const useFetchManagedDomainsApexes = () => {
  const fetchManagedDomains = async (): Promise<ManagedDomainApex[]> => {
    const response = await axios.get(root + '/registration/managed-domain-apexes');
    return response.data;
  };

  return {
    fetchManagedDomainApexes: useQuery<ManagedDomainApex[], AxiosError>({
      queryKey: ['managed-domain-apexes'],
      queryFn: () => fetchManagedDomains(),
    }),
  };
};

//

export const useFetchIsManagedDomainAvailable = (prefix: string, apex: string) => {
  const fetchIsManagedDomainAvailable = async (prefix: string, apex: string): Promise<boolean> => {
    if (!prefix || !apex) return false;

    return await axios
      .get(root + `/registration/is-managed-domain-available/${apex}/${prefix}`)
      .then((response) => response.data);
  };

  return {
    fetchIsManagedDomainAvailable: useQuery<boolean, AxiosError>({
      queryKey: ['is-managed-domain-available', apex, prefix],
      queryFn: () => fetchIsManagedDomainAvailable(prefix, apex),
      gcTime: 0, // Immediately garbage collect this query so it's always fresh
      enabled: true,
      refetchOnWindowFocus: true, // Refetch as the available status may have changed on the server
      retry: false,
    }),
  };
};

//

export const useCreateManagedDomain = () => {
  type PrefixAndApex = {
    domainPrefix: string;
    domainApex: string;
    invitationCode: string | null;
  };

  const createManagedDomain = async ({
    domainPrefix,
    domainApex,
    invitationCode,
  }: PrefixAndApex): Promise<void> => {
    let url = root + `/registration/create-managed-domain/${domainApex}/${domainPrefix}`;
    if (invitationCode) {
      url += `?invitation-code=${invitationCode}`;
    }
    await axios.post(url);
  };

  return {
    createManagedDomain: useMutation<void, AxiosError, PrefixAndApex>({
      mutationFn: createManagedDomain,
    }),
  };
};
