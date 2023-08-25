import { ApiType, DotYouClient, NumberCursoredResult } from '../..';
import { CircleGrant } from './CircleDataTypes';

const root = '/youauthdomain';

export interface DomainMembership {
  circleGrants: CircleGrant[];
  corsHostName: string;
  created: number;
  domain: string;
  isRevoked: boolean;
  modified: number;
  name: string;
}

export interface DomainClient {
  accessRegistrationClientType: string;
  accessRegistrationId: string;
  created: number;
  domain: string;
  friendlyName: string;
  isRevoked: boolean;
}

export const getDomains = async (
  dotYouClient: DotYouClient,
  data: {
    count: number;
    cursor?: number;
  }
): Promise<NumberCursoredResult<DomainMembership>> => {
  const client = dotYouClient.createAxiosClient();
  // const url = root + '/list?' + stringify(data);
  // TODO: Add pagination whent the server supports it
  const url = root + '/list';

  if (dotYouClient.getType() !== ApiType.Owner) {
    throw new Error('Only owner can get domains');
  }

  return client.get(url).then((response) => {
    return { results: response.data, cursor: 1 };
  });
};

export const getDomainInfo = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/domain';

  return client.post<DomainMembership>(url, { domain }).then((response) => {
    return response.data;
  });
};

export const getDomainClients = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient();
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
  const client = dotYouClient.createAxiosClient();
  const url = root + '/deleteClient';

  return client.post(url, { accessRegistrationId }).then((response) => {
    return response.data;
  });
};

export const revokeDomainAccess = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/revoke';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};

export const restoreDomainAccess = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/allow';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};

export const disconnectFromDomain = async (dotYouClient: DotYouClient, domain: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/deleteDomain';

  return client.post(url, { domain }).then((response) => {
    return response.data;
  });
};
