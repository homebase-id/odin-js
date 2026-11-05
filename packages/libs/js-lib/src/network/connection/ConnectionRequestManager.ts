import {
  AcceptRequestHeader,
  ConnectionInfo,
  ConnectionRequestHeader,
  IncomingConnectionRequest,
  OdinIdRequest,
  ConnectionRequest,
} from '../circle/CircleDataTypes';
import { DotYouClient } from '../../core/DotYouClient';
import { PagingOptions, PagedResult } from '../../core/core';
import { stringifyToQueryParams } from '../../helpers/helpers';
import { getConnectionInfo } from './ConnectionManager';

//Handles making and reading requests to connect with others
// V2: /api/v2/connections
const ConnectionsRootV2 = '/connections';
const RequestsRootV2 = ConnectionsRootV2 + '/requests';
const IncomingPathRootV2 = RequestsRootV2 + '/incoming';
const OutgoingPathRootV2 = RequestsRootV2 + '/outgoing';

export const getPendingRequests = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<IncomingConnectionRequest>> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = RequestsRootV2 + '?' + stringifyToQueryParams({ type: 'incoming', ...params });

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getPendingRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ConnectionRequest | null> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = `${IncomingPathRootV2}/${encodeURIComponent(odinId)}`;
  return client
    .get<ConnectionRequest>(url)
    .then((response) => {
      return { ...response.data, status: 'pending' } as const;
    })
    .catch(() => null);
};

export const getSentRequests = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<ConnectionRequest>> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = RequestsRootV2 + '?' + stringifyToQueryParams({ type: 'outgoing', ...params });

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
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = `${OutgoingPathRootV2}/${encodeURIComponent(odinId)}`;

  return client
    .get(url)
    .then((response) => {
      if (!response?.data) return null;
      return { ...response.data, status: 'sent' };
    })
    .catch(() => null);
};

export const acceptConnectionRequest = async (
  dotYouClient: DotYouClient,
  odinId: string,
  circleIds?: string[]
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  // The sender is the resource; the body carries only the circles to grant them
  const url = `${IncomingPathRootV2}/${encodeURIComponent(odinId)}`;
  const body: Pick<AcceptRequestHeader, 'circleIds'> = { circleIds: circleIds || [] };

  return client
    .put(url, body)
    .then(() => true) // V2 answers 204; V1 answered true
    .catch((error) => {
      dotYouClient.handleErrorResponse(error);
      throw error;
    });
};

export const deletePendingRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = `${IncomingPathRootV2}/${encodeURIComponent(odinId)}`;

  return client
    .delete(url)
    .then(() => true) // V2 answers 204; V1 answered true
    .catch((error) => {
      dotYouClient.handleErrorResponse(error);
      throw error;
    });
};

export const deleteSentRequest = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  // No notifyRemote, as before: the server's default (a one-sided cancel) applies
  const url = `${OutgoingPathRootV2}/${encodeURIComponent(odinId)}`;

  return client
    .delete(url)
    .then(() => true) // V2 answers 204; V1 answered true
    .catch((error) => {
      dotYouClient.handleErrorResponse(error);
      throw error;
    });
};

export const sendRequest = async (
  dotYouClient: DotYouClient,
  odinId: string,
  message: string,
  circleIds: string[]
): Promise<boolean> => {
  const url = RequestsRootV2;
  const data: ConnectionRequestHeader = {
    recipient: odinId,
    message: message,
    circleIds: circleIds,
  };

  const client = dotYouClient.createAxiosClient({ v2: true });
  return client
    .post(url, data)
    .then(() => true) // V2 answers 201 with no body; V1 answered true
    .catch((error) => {
      dotYouClient.handleErrorResponse(error);
      throw error;
    });
};

export const blockOdinId = async (dotYouClient: DotYouClient, odinId: string) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = ConnectionsRootV2 + '/block';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then(() => true) // V2 answers an empty 200; V1 answered the service's bool
    .catch((err) => {
      dotYouClient.handleErrorResponse(err);
      return false;
    });
};

export const unblockOdinId = async (dotYouClient: DotYouClient, odinId: string) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = ConnectionsRootV2 + '/unblock';
  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then(() => true) // V2 answers an empty 200; V1 answered the service's bool
    .catch((err) => {
      dotYouClient.handleErrorResponse(err);
      return false;
    });
};

export const getDetailedConnectionInfo = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ConnectionRequest | ConnectionInfo | undefined> => {
  if (!odinId) return;

  const connectionInfo = await getConnectionInfo(dotYouClient, odinId);
  if (connectionInfo && connectionInfo.status.toLowerCase() !== 'none') return connectionInfo;

  const pendingRequest = await getPendingRequest(dotYouClient, odinId);
  if (pendingRequest) return { ...pendingRequest };

  const sentRequest = await getSentRequest(dotYouClient, odinId);
  if (sentRequest) return { ...sentRequest };

  return undefined;
};
