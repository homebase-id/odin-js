import {
  AcceptRequestHeader,
  ConnectionInfo,
  ConnectionRequestHeader,
  IncomingConnectionRequest,
  OdinIdRequest,
  ConnectionRequest,
} from '../circle/CircleDataTypes';
import { OdinClient } from '../../core/OdinClient';
import { PagingOptions, PagedResult } from '../../core/core';
import { stringifyToQueryParams } from '../../helpers/helpers';
import { getConnectionInfo } from './ConnectionManager';

//Handles making and reading requests to connect with others
const Root = '/circles/requests';
const SentPathRoot: string = Root + '/sent';
const PendingPathRoot: string = Root + '/pending';

export const getPendingRequests = async (
  odinClient: OdinClient,
  params: PagingOptions
): Promise<PagedResult<IncomingConnectionRequest>> => {
  const client = odinClient.createAxiosClient();
  const url = PendingPathRoot + '/list?' + stringifyToQueryParams(params);

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const getPendingRequest = async (
  odinClient: OdinClient,
  odinId: string
): Promise<ConnectionRequest | null> => {
  const client = odinClient.createAxiosClient();
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
  odinClient: OdinClient,
  params: PagingOptions
): Promise<PagedResult<ConnectionRequest>> => {
  const client = odinClient.createAxiosClient();
  const url = SentPathRoot + '/list?' + stringifyToQueryParams(params);

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const getSentRequest = async (
  odinClient: OdinClient,
  odinId: string
): Promise<ConnectionRequest> => {
  const client = odinClient.createAxiosClient();
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
  odinClient: OdinClient,
  odinId: string,
  circleIds?: string[]
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const url = PendingPathRoot + '/accept/';

  const header: AcceptRequestHeader = {
    sender: odinId,
    circleIds: circleIds || [],
    permissions: undefined,
  };

  return client
    .post(url, header)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const deletePendingRequest = async (
  odinClient: OdinClient,
  odinId: string
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const url = PendingPathRoot + '/delete';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const deleteSentRequest = async (
  odinClient: OdinClient,
  odinId: string
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const url = SentPathRoot + '/delete';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const sendRequest = async (
  odinClient: OdinClient,
  odinId: string,
  message: string,
  circleIds: string[]
): Promise<boolean> => {
  const url = Root + '/sendrequest';
  const data: ConnectionRequestHeader = {
    recipient: odinId,
    message: message,
    circleIds: circleIds,
  };

  const client = odinClient.createAxiosClient();
  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const blockOdinId = async (odinClient: OdinClient, odinId: string) => {
  const client = odinClient.createAxiosClient();
  const url = '/circles/connections/block';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post<boolean>(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((err) => {
      odinClient.handleErrorResponse(err);
      return false;
    });
};

export const unblockOdinId = async (odinClient: OdinClient, odinId: string) => {
  const client = odinClient.createAxiosClient();
  const url = '/circles/connections/unblock';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post<boolean>(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((err) => {
      odinClient.handleErrorResponse(err);
      return false;
    });
};

export const getDetailedConnectionInfo = async (
  odinClient: OdinClient,
  odinId: string
): Promise<ConnectionRequest | ConnectionInfo | undefined> => {
  if (!odinId) return;

  const connectionInfo = await getConnectionInfo(odinClient, odinId);
  if (connectionInfo && connectionInfo.status.toLowerCase() !== 'none') return connectionInfo;

  const pendingRequest = await getPendingRequest(odinClient, odinId);
  if (pendingRequest) return { ...pendingRequest };

  const sentRequest = await getSentRequest(odinClient, odinId);
  if (sentRequest) return { ...sentRequest };

  return undefined;
};
