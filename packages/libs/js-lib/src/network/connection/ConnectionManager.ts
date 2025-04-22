import {
  ApiType,
  OdinClient,
  assertIfOdinClientIsOwner,
  assertIfOdinClientIsOwnerOrApp,
} from '../../core/OdinClient';
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
  odinClient: OdinClient,
  odinId: string
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const url = root + '/disconnect';
  const data: OdinIdRequest = { odinId: odinId };
  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const getConnections = async (
  odinClient: OdinClient,
  data: {
    count: number;
    cursor?: unknown;
  }
): Promise<NumberCursoredResult<ActiveConnection>> => {
  const client = odinClient.createAxiosClient();
  const url = root + '/connected?' + stringifyToQueryParams(data);

  if (odinClient.getType() === ApiType.Owner) {
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
  odinClient: OdinClient,
  params: PagingOptions
): Promise<PagedResult<DotYouProfile>> => {
  assertIfOdinClientIsOwner(odinClient);
  const client = odinClient.createAxiosClient();
  const url = root + '/blocked?' + stringifyToQueryParams(params);
  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const getConnectionInfo = (
  odinClient: OdinClient,
  odinId: string
): Promise<ConnectionInfo | undefined> => {
  assertIfOdinClientIsOwnerOrApp(odinClient);

  const client = odinClient.createAxiosClient();
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
    .catch(odinClient.handleErrorResponse);
};
