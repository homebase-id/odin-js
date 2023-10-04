import axios, { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { DnsConfig } from '../commonDomain/commonDomain';

const root = '//' + window.location.host + '/api/registration/v1';

//

export const useFetchOwnDomainDnsConfig = (domain: string) => {
  const fetchOwnDomainDnsConfig = async (
    domain: string
  ): Promise<DnsConfig> => {
    const response = await axios.get(
      `${root}/registration/dns-config/${domain}`
    );
    // console.log(response.data)
    return response.data;
  };

  return {
    fetchOwnDomainDnsConfig: useQuery<DnsConfig, AxiosError>(
      ['own-domain-dns-config', domain],
      () => fetchOwnDomainDnsConfig(domain),
      {
        enabled: !!domain,
        retry: (failureCount, error) =>
          error?.response?.status ? error.response.status >= 500 : false,
      }
    ),
  };
};

//

export const useFetchIsOwnDomainAvailable = (domain: string) => {
  const fetchIsOwnDomainAvailable = async (
    domain: string
  ): Promise<boolean> => {
    if (!domain) return false;

    const response = await axios.get(
      root + `/registration/is-own-domain-available/${domain}`
    );

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

export const useFetchOwnDomainDnsStatus = (
  domain: string,
  refetchNeeded: (dnsConfig: DnsConfig) => boolean
) => {
  const fetchOwnDomainDnsStatus = async (
    domain: string
  ): Promise<DnsConfig> => {
    const response = await axios.get(
      `${root}/registration/own-domain-dns-status/${domain}`
    );
    // console.log(response.data)
    return response.data;
  };

  return {
    fetchOwnDomainDnsStatus: useQuery<DnsConfig, AxiosError>(
      ['own-domain-dns-config', domain],
      () => fetchOwnDomainDnsStatus(domain),
      {
        enabled: !!domain,
        refetchInterval: (dnsConfig) =>
          !dnsConfig || refetchNeeded(dnsConfig) ? 2000 : false,
        retry: (failureCount, error) =>
          error?.response?.status ? error.response.status >= 500 : false,
      }
    ),
  };
};

//
