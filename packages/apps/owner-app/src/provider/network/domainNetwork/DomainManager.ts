import { DotYouClient } from '@homebase-id/js-lib/core';

const root = '/youauth-domains';

export interface DomainClient {
  accessRegistrationClientType: string;
  accessRegistrationId: string;
  created: number;
  domain: string;
  friendlyName: string;
  isRevoked: boolean;
}

export const getDomainClients = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = `${root}/clients?domain=${domain}`;

  return client.get<DomainClient[]>(url).then((response) => {
    return response.data;
  });
};

export const removeDomainClient = async (
  dotYouClient: DotYouClient,
  domain: string,
  accessRegistrationId: string
) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = root + '/delete-client';

  return client.post(url, { accessRegistrationId }).then((response) => {
    return response.data;
  });
};

export const revokeDomainAccess = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = root + '/revoke';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};

export const restoreDomainAccess = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = root + '/allow';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};

export const disconnectFromDomain = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = root + '/delete-domain';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};
