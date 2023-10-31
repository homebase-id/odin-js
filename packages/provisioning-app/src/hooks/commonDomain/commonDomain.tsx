import { useMutation, useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

export type DnsRecordStatus =
  | 'unknown'
  | 'success'
  | 'domainOrRecordNotFound'
  | 'incorrectValue'
  | 'multipleRecordsNotSupported'
  | 'aaaaRecordsNotSupported'
  | 'noAuthorativeNameServer';

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description: string;
  status: DnsRecordStatus;
  statusText: string;
}

export type DnsConfig = Array<DnsRecord>;

//

export function hasInvalidDnsRecords(dnsConfig: DnsConfig | undefined): boolean {
  if (!dnsConfig) return true;

  const aliasARecord = dnsConfig.find((record) => record.type === 'ALIAS');
  const fallbackARecord = dnsConfig.find((record) => record.type === 'A');
  const subRecords = dnsConfig.filter((record) => !!record.name);

  const mainRecordValid =
    aliasARecord?.status === 'success' || fallbackARecord?.status === 'success';

  const subRecordsValid = !subRecords.some((record) => record.status !== 'success');

  return !mainRecordValid || !subRecordsValid;
}

// //

// export const useDidDnsRecordsPropagate = (domain: string) => {
//   const root = '//' + window.location.host + '/api/registration/v1';

//   const didDnsRecordsPropagete = async (domain: string): Promise<boolean> => {
//     if (!domain) {
//       return Promise.resolve(false);
//     }

//     const response = await axios.get(root + `/registration/did-dns-records-propagate/${domain}`);
//     // console.log(response.data)
//     return response.data;
//   };

//   return {
//     fetchDidDnsRecordsPropagate: useQuery<boolean, AxiosError>(
//       ['did-dns-records-propagate', domain],
//       () => didDnsRecordsPropagete(domain),
//       {
//         enabled: !!domain,
//         refetchInterval: (propagated) => (!propagated ? 2000 : false),
//         refetchOnWindowFocus: false,
//         retry: false,
//       }
//     ),
//   };
// };

//

export const useCanConnectToDomain = (domain: string, port: number) => {
  const root = '//' + window.location.host + '/api/registration/v1';

  const canConnectToDomain = async (domain: string, port: number): Promise<boolean> => {
    if (!domain) {
      return Promise.resolve(false);
    }

    const response = await axios.get(root + `/registration/can-connect-to/${domain}/${port}`);
    return response.data;
  };

  return {
    fetchCanConnectToDomain: useQuery<boolean, AxiosError>({
      queryKey: ['can-connect-to-domain', domain, port],
      queryFn: () => canConnectToDomain(domain, port),
      enabled: !!domain,
      refetchInterval: (success) => (!success ? 1000 : false),
      refetchOnWindowFocus: false,
      retry: false,
    }),
  };
};

//

export const useDomainHasValidCertificate = (domain: string, enabled: boolean) => {
  const root = '//' + window.location.host + '/api/registration/v1';

  const domainHasValidCertificate = async (domain: string): Promise<boolean> => {
    if (!domain) {
      return Promise.resolve(false);
    }

    const response = await axios.get(root + `/registration/has-valid-certificate/${domain}`);
    // console.log(response.data)
    return response.data;
  };

  return {
    fetchDomainHasValidCertificate: useQuery<boolean, AxiosError>({
      queryKey: ['has-valid-certificate', domain],
      queryFn: () => domainHasValidCertificate(domain),
      enabled,
      initialData: false,
      refetchInterval: (success) => (!success ? 1000 : false),
      refetchOnWindowFocus: false,
      retry: false,
    }),
  };
};

//

type CreateIdentityKey = {
  domain: string;
  email: string;
  planId: string;
  invitationCode: string;
};

export const useCreateIdentity = () => {
  const root = '//' + window.location.host + '/api/registration/v1';

  const createIdentity = async (identity: CreateIdentityKey): Promise<string> => {
    const response = await axios.post(
      root + `/registration/create-identity-on-domain/${identity.domain}`,
      {
        email: identity.email,
        planId: identity.planId,
        invitationCode: identity.invitationCode,
      }
    );
    //console.log(response.data)
    return response.data;
  };

  return {
    createIdentity: useMutation<string, AxiosError, CreateIdentityKey>({
      mutationFn: createIdentity,
    }),
  };
};
