import {
  ApiType,
  DotYouClient,
  assertIfDotYouClientIsOwner,
  assertIfDotYouClientIsOwnerOrApp,
} from '../../core/DotYouClient';
import {
  NumberCursoredResult,
  PagedResult,
  PagingOptions,
} from '../../core/DriveData/Query/DriveQueryTypes';
import { stringifyToQueryParams } from '../../helpers/DataUtil';
import {
  ConnectionInfo,
  OdinIdRequest,
  DotYouProfile,
  ActiveConnection,
} from '../circle/CircleDataTypes';

const root = '/circles/connections';

export const disconnectFromContact = (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/disconnect';
  const data: OdinIdRequest = { odinId: odinId };
  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getConnections = async (
  dotYouClient: DotYouClient,
  data: {
    count: number;
    cursor?: unknown;
  }
): Promise<NumberCursoredResult<ActiveConnection>> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/connected?' + stringifyToQueryParams(data);

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
  assertIfDotYouClientIsOwner(dotYouClient);
  const client = dotYouClient.createAxiosClient();
  const url = root + '/blocked?' + stringifyToQueryParams(params);
  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getConnectionInfo = (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ConnectionInfo | undefined> => {
  assertIfDotYouClientIsOwnerOrApp(dotYouClient);

  const client = dotYouClient.createAxiosClient();
  const url = root + '/status';

  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      return {
        ...response.data,
        status: response.data?.status?.toLowerCase(),
        contactData: response.data?.originalContactData,
        originalContactData: undefined,
      };
    })
    .catch(dotYouClient.handleErrorResponse);
};
