import { OdinClient, NumberCursoredResult } from '@homebase-id/js-lib/core';
import { CircleGrant } from '@homebase-id/js-lib/network';

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

export const getDomains = async (
  odinClient: OdinClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data: {
    count: number;
    cursor?: unknown;
  }
): Promise<NumberCursoredResult<DomainMembership>> => {
  const client = odinClient.createAxiosClient();
  // const url = root + '/list?' + stringifyToQueryParams(data);
  // TODO: Add pagination whent the server supports it
  const url = root + '/list';

  return client.get(url).then((response) => {
    return { results: response.data, cursor: 1 };
  });
};

export const getDomainInfo = async (odinClient: OdinClient, domain: string) => {
  const client = odinClient.createAxiosClient();
  const url = root + '/domain';

  return client.post<DomainMembership>(url, { domain }).then((response) => {
    return response.data;
  });
};
