import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { PagedResult, PagingOptions } from '../../core/Types';
import { ConnectionInfo, DotYouIdRequest, DotYouProfile } from './CircleDataTypes';

const stringify = (obj: any) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

const root = '/circles/connections';

export const disconnectFromContact = (
  dotYouClient: DotYouClient,
  dotYouId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/disconnect';
  const data: DotYouIdRequest = { dotYouId: dotYouId };
  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getConnections = async (
  dotYouClient: DotYouClient,
  data: PagingOptions
): Promise<PagedResult<{ dotYouId: string } | DotYouProfile>> => {
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

export const getBlockedConnections = (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<DotYouProfile>> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/blocked?' + stringify(params);
  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getConnectionInfo = (
  dotYouClient: DotYouClient,
  dotYouId: string,
  includeContactData = false
): Promise<ConnectionInfo | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/status?omitContactData=${!includeContactData}`;

  const data: DotYouIdRequest = { dotYouId: dotYouId };

  return client
    .post(url, data)
    .then((response) => {
      return { ...response.data, status: response.data?.status?.toLowerCase() };
    })
    .catch(dotYouClient.handleErrorResponse);
};
