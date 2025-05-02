import { OdinClient } from '@homebase-id/js-lib/core';

const root = '/youauthdomain';

export interface DomainClient {
  accessRegistrationClientType: string;
  accessRegistrationId: string;
  created: number;
  domain: string;
  friendlyName: string;
  isRevoked: boolean;
}

export const getDomainClients = async (odinClient: OdinClient, domain: string) => {
  const client = odinClient.createAxiosClient();
  const url = `${root}/clients?domain=${domain}`;

  return client.get<DomainClient[]>(url).then((response) => {
    return response.data;
  });
};

export const removeDomainClient = async (
  odinClient: OdinClient,
  domain: string,
  accessRegistrationId: string
) => {
  const client = odinClient.createAxiosClient();
  const url = root + '/deleteClient';

  return client.post(url, { accessRegistrationId }).then((response) => {
    return response.data;
  });
};

export const revokeDomainAccess = async (odinClient: OdinClient, domain: string) => {
  const client = odinClient.createAxiosClient();
  const url = root + '/revoke';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};

export const restoreDomainAccess = async (odinClient: OdinClient, domain: string) => {
  const client = odinClient.createAxiosClient();
  const url = root + '/allow';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};

export const disconnectFromDomain = async (odinClient: OdinClient, domain: string) => {
  const client = odinClient.createAxiosClient();
  const url = root + '/deleteDomain';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};
