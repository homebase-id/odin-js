import axios, { AxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Region } from '../../helpers/region';

const root = '//' + window.location.host + '/api/registration/v1';

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
      // Server config; the route guard and the signup page both mount an
      // observer on this key, and without a staleTime that is two GETs
      staleTime: 1000 * 60 * 5,
    }),
  };
};

//

export const useFetchIsManagedDomainAvailable = (prefix: string, apex: string) => {
  const fetchIsManagedDomainAvailable = async (): Promise<boolean> =>
    await axios
      .get(root + `/registration/is-managed-domain-available/${apex}/${prefix}`)
      .then((response) => response.data);

  return {
    fetchIsManagedDomainAvailable: useQuery<boolean, AxiosError>({
      queryKey: ['is-managed-domain-available', apex, prefix],
      queryFn: fetchIsManagedDomainAvailable,
      // An empty prefix would otherwise resolve as "taken" rather than "unknown"
      enabled: !!prefix && !!apex,
      // Long enough that stepping back from the confirm step doesn't re-check a
      // name the user just saw confirmed
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true, // The available status may have changed on the server
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
    // Not consumed by the server yet; sent so the hosting region can be acted on
    // later without another frontend change
    region?: Region | null;
  };

  const createManagedDomain = async ({
    domainPrefix,
    domainApex,
    invitationCode,
    region,
  }: PrefixAndApex): Promise<void> => {
    const url = root + `/registration/create-managed-domain/${domainApex}/${domainPrefix}`;

    const params = new URLSearchParams();
    if (invitationCode) params.set('invitation-code', invitationCode);
    if (region) params.set('region', region);

    const query = params.toString();
    await axios.post(query ? `${url}?${query}` : url);
  };

  return {
    createManagedDomain: useMutation<void, AxiosError, PrefixAndApex>({
      mutationFn: createManagedDomain,
    }),
  };
};
