import { DotYouClient, NumberCursoredResult } from '@youfoundation/js-lib/core';
import { CircleGrant } from '@youfoundation/js-lib/network';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data: {
    count: number;
    cursor?: number;
  }
): Promise<NumberCursoredResult<DomainMembership>> => {
  const client = dotYouClient.createAxiosClient();
  // const url = root + '/list?' + stringifyToQueryParams(data);
  // TODO: Add pagination whent the server supports it
  const url = root + '/list';

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
