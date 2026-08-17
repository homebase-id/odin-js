import axios, { AxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
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

// Pre-provisions the DNS zone for the domain on Homebase's nameservers so the user can
// delegate via NS records (or keep the manual-records flow; the zone is inert until
// delegated). Idempotent; a no-op on servers without zone hosting configured.
export const useCreateOwnDomainZone = () => {
  const createOwnDomainZone = async ({
    domain,
    invitationCode,
  }: {
    domain: string;
    invitationCode: string | null;
  }): Promise<void> => {
    const query = invitationCode
      ? `?${new URLSearchParams({ 'invitation-code': invitationCode })}`
      : '';
    await axios.post(`${root}/registration/create-own-domain-zone/${domain}${query}`);
  };

  return {
    createOwnDomainZone: useMutation<void, AxiosError, { domain: string; invitationCode: string | null }>({
      mutationFn: createOwnDomainZone,
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

// NOTE: the former useApexDomain (lookup-zone-apex) hook is gone on purpose: a zone
// lookup cannot decide apex-vs-subdomain anymore, because a subdomain delegated to
// Homebase has its own SOA and looks like an apex. See helpers/registrableDomain.ts.
