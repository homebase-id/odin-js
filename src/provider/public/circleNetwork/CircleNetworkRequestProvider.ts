import {
  AcceptRequestHeader,
  ConnectionRequest,
  ConnectionRequestHeader,
  DotYouIdRequest,
} from './CircleDataTypes';
import { DataUtil } from '../../core/DataUtil';
import { DotYouClient } from '../../core/DotYouClient';
import { PagingOptions, PagedResult } from '../../core/Types';

//Handles making and reading requests to connect with others
const Root = '/circles/requests';
const SentPathRoot: string = Root + '/sent';
const PendingPathRoot: string = Root + '/pending';

export const getPendingRequests = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<ConnectionRequest> | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url =
    PendingPathRoot + '/list?' + DataUtil.stringify(params as unknown as Record<string, unknown>);

  return client
    .get<PagedResult<ConnectionRequest>>(url)
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
  dotYouId: string
): Promise<ConnectionRequest> => {
  const client = dotYouClient.createAxiosClient();
  const url = PendingPathRoot + '/single';
  const data: DotYouIdRequest = { dotYouId: dotYouId };
  return client
    .post(url, data)
    .then((response) => {
      return { ...response.data, status: 'pending' };
    })
    .catch(() => {
      return undefined;
    });
};

export const getSentRequests = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<ConnectionRequest>> => {
  const client = dotYouClient.createAxiosClient();
  const url =
    SentPathRoot + '/list?' + DataUtil.stringify(params as unknown as Record<string, unknown>);

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getSentRequest = async (
  dotYouClient: DotYouClient,
  dotYouId: string
): Promise<ConnectionRequest> => {
  const client = dotYouClient.createAxiosClient();
  const url = SentPathRoot + '/single';
  const data: DotYouIdRequest = { dotYouId: dotYouId };

  return client
    .post(url, data)
    .then((response) => {
      return { ...response.data, status: 'sent' };
    })
    .catch((err) => {
      if (err.response.status === 404) {
        return null;
      }
      dotYouClient.handleErrorResponse(err);
    });
};

export const acceptConnectionRequest = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  name: string,
  photoFileId?: string | undefined,
  circleIds?: string[]
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = PendingPathRoot + '/accept/';

  const header: AcceptRequestHeader = {
    sender: dotYouId,
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
  dotYouId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = PendingPathRoot + '/delete';
  const data: DotYouIdRequest = { dotYouId: dotYouId };

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const deleteSentRequest = async (
  dotYouClient: DotYouClient,
  dotYouId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = SentPathRoot + '/delete';
  const data: DotYouIdRequest = { dotYouId: dotYouId };

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const sendRequest = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  message: string,
  name: string,
  photoFileId: string | undefined,
  circleIds: string[]
): Promise<boolean> => {
  const url = Root + '/sendrequest';
  const data: ConnectionRequestHeader = {
    recipient: dotYouId,
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

export const blockDotYouId = async (dotYouClient: DotYouClient, dotYouId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = '/circles/connections/block';
  const data: DotYouIdRequest = { dotYouId: dotYouId };

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

export const unblockDotYouId = async (dotYouClient: DotYouClient, dotYouId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = '/circles/connections/unblock';
  const data: DotYouIdRequest = { dotYouId: dotYouId };

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
