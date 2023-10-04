import axios, { AxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';

const root = '//' + window.location.host + '/api/registration/v1';

//

export interface ManagedDomainApex {
  apex: string;
  prefixLabels: string[];
}

//

export const useFetchManagedDomainsApexes = () => {
  const fetchManagedDomains = async (): Promise<ManagedDomainApex[]> => {
    const response = await axios.get(
      root + '/registration/managed-domain-apexes'
    );
    return response.data;
  };

  return {
    fetchManagedDomainApexes: useQuery<ManagedDomainApex[], AxiosError>(
      ['managed-domain-apexes'],
      () => fetchManagedDomains()
    ),
  };
};

//

export const useFetchIsManagedDomainAvailable = (
  prefix: string,
  apex: string
) => {
  const fetchIsManagedDomainAvailable = async (
    prefix: string,
    apex: string
  ): Promise<boolean> => {
    if (!prefix || !apex) return false;

    return await axios
      .get(root + `/registration/is-managed-domain-available/${apex}/${prefix}`)
      .then((response) => response.data);
  };

  return {
    fetchIsManagedDomainAvailable: useQuery<boolean, AxiosError>(
      ['is-managed-domain-available', apex, prefix],
      () => fetchIsManagedDomainAvailable(prefix, apex),
      {
        cacheTime: 0,
        enabled: true,
        refetchOnWindowFocus: true, // Refetch as the available status may have changed on the server
        retry: false,
      }
    ),
  };
};

//

export const useCreateManagedDomain = () => {
  type PrefixAndApex = {
    domainPrefix: string;
    domainApex: string;
  };

  const createManagedDomain = async ({
    domainPrefix,
    domainApex,
  }: PrefixAndApex): Promise<void> => {
    await axios.post(
      root + `/registration/create-managed-domain/${domainApex}/${domainPrefix}`
    );
  };

  return {
    createManagedDomain: useMutation<void, AxiosError, PrefixAndApex>(
      createManagedDomain
    ),
  };
};
