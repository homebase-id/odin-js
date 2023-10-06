import axios, { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { DnsConfig } from '../commonDomain/commonDomain';

const root = '/api/registration/v1';

//

export const useFetchIsOwnDomainAvailable = (domain: string) => {
  const fetchIsOwnDomainAvailable = async (domain: string): Promise<boolean> => {
    if (!domain) return false;

    const response = await axios.get(root + `/registration/is-own-domain-available/${domain}`);

    return response.data;
  };

  return {
    fetchIsOwnDomainAvailable: useQuery<boolean, AxiosError>(
      ['is-own-domain-available', domain],
      () => fetchIsOwnDomainAvailable(domain),
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

export const useFetchOwnDomainDnsConfig = (domain: string) => {
  const fetchOwnDomainDnsConfig = async (domain: string): Promise<DnsConfig> => {
    const response = await axios.get(`${root}/registration/dns-config/${domain}?includeAlias=true`);
    return response.data;
  };

  const fetchOwnDomainDnsStatus = async (domain: string): Promise<DnsConfig | null> => {
    if (!domain) return null;
    const response = await axios.get(
      `${root}/registration/own-domain-dns-status/${domain}?includeAlias=true`
    );
    return response.data;
  };

  return {
    fetchOwnDomainDnsConfig: useQuery<DnsConfig, AxiosError>(
      ['own-domain-dns-config', domain],
      () => fetchOwnDomainDnsConfig(domain),
      {
        enabled: !!domain,
        retry: (_failureCount, error) =>
          error?.response?.status ? error.response.status >= 500 : false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      }
    ),
    fetchOwnDomainDnsStatus: useQuery<DnsConfig | null, AxiosError>(
      ['own-domain-dns-config', domain],
      () => fetchOwnDomainDnsStatus(domain as string),
      {
        enabled: !!domain,
        retry: (_failureCount, error) =>
          error?.response?.status ? error.response.status >= 500 : false,
        refetchOnMount: false,
      }
    ),
  };
};

//

export const useApexDomain = (domain?: string) => {
  const getApexDomain = async (domain?: string) => {
    if (!domain) return null;
    const response = await axios.get(`${root}/registration/lookup-zone-apex/${domain}`);
    return response.data;
  };

  return useQuery(['apex-domain', domain], () => getApexDomain(domain), {
    retry: false,
    enabled: !!domain,
    cacheTime: Infinity,
    staleTime: Infinity,
  });
};
