import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { PagedResult, PagingOptions } from '../../core/Types';

const stringify = (obj: any) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

const root = '/circles/connections';

export const getConnections = async (
  dotYouClient: DotYouClient,
  data: PagingOptions
): Promise<PagedResult<{ dotYouId: string }>> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/connected?' + stringify(data);

  if (dotYouClient.getType() === ApiType.Owner) {
    // Post needed
    return client.post(url).then((response) => {
      return response.data;
    });
  } else {
    return client.get(url).then((response) => {
      return response.data;
    });
  }
};
