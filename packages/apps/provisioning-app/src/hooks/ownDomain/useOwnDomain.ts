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
// delegated). The server only creates the zone once domain control is provable;
// `reason` distinguishes the transient refusal (controlNotProven - retry after DNS
// setup) from permanent ones (shadowsHostedZone, notConfigured).
export interface CreateOwnDomainZoneResult {
  created: boolean;
  reason: 'created' | 'notConfigured' | 'shadowsHostedZone' | 'zoneAlreadyHosted' | 'controlNotProven';
}

export const useCreateOwnDomainZone = () => {
  const createOwnDomainZone = async ({
    domain,
    invitationCode,
  }: {
    domain: string;
    invitationCode: string | null;
  }): Promise<CreateOwnDomainZoneResult> => {
    const query = invitationCode
      ? `?${new URLSearchParams({ 'invitation-code': invitationCode })}`
      : '';
    const response = await axios.post<CreateOwnDomainZoneResult>(
      `${root}/registration/create-own-domain-zone/${domain}${query}`
    );
    return response.data;
  };

  return {
    createOwnDomainZone: useMutation<
      CreateOwnDomainZoneResult,
      AxiosError,
      { domain: string; invitationCode: string | null }
    >({
      mutationFn: createOwnDomainZone,
    }),
  };
};

//

// The server's overall verdict rides on the HTTP status: 200 = DNS setup is valid,
// 202 = not yet. The client does NOT re-derive success from the records - the server
// owns that rule (DnsLookupService.AreDnsLookupsSuccessful).
export interface OwnDomainDnsStatus {
  success: boolean;
  records: DnsConfig;
}

export const useFetchOwnDomainDnsConfig = (domain: string) => {
  const fetchOwnDomainDnsConfig = async (domain: string): Promise<DnsConfig> => {
    const response = await axios.get(`${root}/registration/dns-config/${domain}?includeAlias=true`);
    return response.data;
  };

  const fetchOwnDomainDnsStatus = async (domain: string): Promise<OwnDomainDnsStatus | null> => {
    if (!domain) return null;
    const response = await axios.get(
      `${root}/registration/own-domain-dns-status/${domain}?includeAlias=true`
    );
    return { success: response.status === 200, records: response.data };
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
    fetchOwnDomainDnsStatus: useQuery<OwnDomainDnsStatus | null, AxiosError>({
      queryKey: ['own-domain-dns-status', domain],
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
