import {
  AcceptRequestHeader,
  ConnectionInfo,
  ConnectionRequest,
  ConnectionRequestHeader,
  OdinIdRequest,
  RedactedConnectionRequest,
} from './CircleDataTypes';
import { DotYouClient } from '../../core/DotYouClient';
import { PagingOptions, PagedResult } from '../../core/core';
import { stringifyToQueryParams } from '../../helpers/helpers';
import { getConnectionInfo } from './CircleNetworkProvider';

//Handles making and reading requests to connect with others
const Root = '/circles/requests';
const SentPathRoot: string = Root + '/sent';
const PendingPathRoot: string = Root + '/pending';

export const getPendingRequests = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<RedactedConnectionRequest> | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url =
    PendingPathRoot +
    '/list?' +
    stringifyToQueryParams(params as unknown as Record<string, unknown>);

  return client
    .get<PagedResult<RedactedConnectionRequest>>(url)
    .then((response) => {
      return response.data;
    })
    .catch(() => {
      dotYouClient.handleErrorResponse;
      return undefined;
    });
};

export const getPendingRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ConnectionRequest | null> => {
  const client = dotYouClient.createAxiosClient();
  const url = PendingPathRoot + '/single';
  const data: OdinIdRequest = { odinId: odinId };
  return client
    .post<ConnectionRequest>(url, data)
    .then((response) => {
      return { ...response.data, status: 'pending' } as const;
    })
    .catch(() => null);
};

export const getSentRequests = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<ConnectionRequest>> => {
  const client = dotYouClient.createAxiosClient();
  const url =
    SentPathRoot + '/list?' + stringifyToQueryParams(params as unknown as Record<string, unknown>);

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getSentRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ConnectionRequest> => {
  const client = dotYouClient.createAxiosClient();
  const url = SentPathRoot + '/single';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      if (!response?.data) return null;
      return { ...response.data, status: 'sent' };
    })
    .catch(() => null);
};

export const acceptConnectionRequest = async (
  dotYouClient: DotYouClient,
  odinId: string,
  name: string,
  photoFileId?: string | undefined,
  circleIds?: string[]
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = PendingPathRoot + '/accept/';

  const header: AcceptRequestHeader = {
    sender: odinId,
    circleIds: circleIds || [],
    permissions: undefined,
    contactData: { name },
  };

  if (photoFileId) {
    header.contactData.imageId = photoFileId;
  }

  return client
    .post(url, header)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const deletePendingRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = PendingPathRoot + '/delete';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const deleteSentRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = SentPathRoot + '/delete';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const sendRequest = async (
  dotYouClient: DotYouClient,
  odinId: string,
  message: string,
  name: string,
  photoFileId: string | undefined,
  circleIds: string[]
): Promise<boolean> => {
  const url = Root + '/sendrequest';
  const data: ConnectionRequestHeader = {
    recipient: odinId,
    message: message,
    contactData: { name },
    circleIds: circleIds,
  };

  if (photoFileId) {
    data.contactData.imageId = photoFileId;
  }

  const client = dotYouClient.createAxiosClient();
  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const blockOdinId = async (dotYouClient: DotYouClient, odinId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = '/circles/connections/block';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post<boolean>(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((err) => {
      dotYouClient.handleErrorResponse(err);
      return false;
    });
};

export const unblockOdinId = async (dotYouClient: DotYouClient, odinId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = '/circles/connections/unblock';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post<boolean>(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((err) => {
      dotYouClient.handleErrorResponse(err);
      return false;
    });
};

export const getDetailedConnectionInfo = async (
  dotYouClient: DotYouClient,
  odinId: string,
  includeContactData = false
): Promise<ConnectionRequest | ConnectionInfo | undefined> => {
  if (!odinId) return;

  const connectionInfo = await getConnectionInfo(dotYouClient, odinId, includeContactData);
  if (connectionInfo && connectionInfo.status.toLowerCase() !== 'none') return connectionInfo;

  const pendingRequest = await getPendingRequest(dotYouClient, odinId);
  if (pendingRequest) return { ...pendingRequest, contactData: connectionInfo?.contactData };

  const sentRequest = await getSentRequest(dotYouClient, odinId);
  if (sentRequest) return { ...sentRequest, contactData: connectionInfo?.contactData };

  return undefined;
};
