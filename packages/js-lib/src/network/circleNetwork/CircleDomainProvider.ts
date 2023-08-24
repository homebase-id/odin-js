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
