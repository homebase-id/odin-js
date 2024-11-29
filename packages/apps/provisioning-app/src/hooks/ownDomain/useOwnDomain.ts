import axios, { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { DnsConfig } from '../commonDomain/commonDomain';

export type OwnDomainProvisionState = 'EnteringDetails' | 'DnsRecords' | 'Provisioning' | 'Failed';

const root = '/api/registration/v1';

//

export const useFetchIsOwnDomainAvailable = (domain: string) => {
  const fetchIsOwnDomainAvailable = async (domain: string): Promise<boolean> => {
    if (!domain) return false;

    const response = await axios.get(root + `/registration/is-own-domain-available/${domain}`);

    return response.data;
  };

  return {
    fetchIsOwnDomainAvailable: useQuery<boolean, AxiosError>({
      queryKey: ['is-own-domain-available', domain],
      queryFn: () => fetchIsOwnDomainAvailable(domain),
      gcTime: 0,
      enabled: true,
      refetchOnWindowFocus: true, // Refetch as the available status may have changed on the server
      retry: false,
    }),
  };
};

//

export const useFetchOwnDomainDnsConfig = (domain: string) => {
  const fetchOwnDomainDnsConfig = async (domain: string): Promise<DnsConfig> => {
    const response = await axios.get(`${root}/registration/dns-config/${domain}?includeAlias=true`);
    return response.data;
  };

  const fetchOwnDomainDnsStatus = async (domain: string): Promise<DnsConfig | null> => {
    if (!domain) return null;
    return await axios
      .get(`${root}/registration/own-domain-dns-status/${domain}?includeAlias=true`)
      .then((response) => response.data);
  };

  return {
    fetchOwnDomainDnsConfig: useQuery<DnsConfig, AxiosError>({
      queryKey: ['own-domain-dns-config', domain],
      queryFn: () => fetchOwnDomainDnsConfig(domain),

      enabled: !!domain,
      retry: (_failureCount, error) =>
        error?.response?.status ? error.response.status >= 500 : false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }),
    fetchOwnDomainDnsStatus: useQuery<DnsConfig | null, AxiosError>({
      queryKey: ['own-domain-dns-config', domain],
      queryFn: () => fetchOwnDomainDnsStatus(domain as string),

      enabled: !!domain,
      retry: (_failureCount, error) =>
        error?.response?.status ? error.response.status >= 500 : false,
      gcTime: Infinity,
      staleTime: 1000 * 60 * 10,
      refetchInterval: 1000 * 15,
    }),
  };
};

//

export const useApexDomain = (domain?: string) => {
  const getApexDomain = async (domain?: string) => {
    if (!domain) return null;
    const response = await axios.get<string>(`${root}/registration/lookup-zone-apex/${domain}`);
    return response.data;
  };

  return useQuery({
    queryKey: ['apex-domain', domain],
    queryFn: () => getApexDomain(domain),
    retry: false,
    enabled: !!domain,
    gcTime: 1000 * 60 * 60 * 24, // 24 hours => Very unlikely to change
    staleTime: 1000 * 60 * 60 * 24, // 24 hours => Very unlikely to change
  });
};
