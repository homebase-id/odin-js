import { OdinClient } from '../../core/OdinClient';
import { CursoredResult } from '../../core/DriveData/Query/DriveQueryTypes';
import { TargetDrive } from '../../core/core';
import { stringifyToQueryParams } from '../../helpers/DataUtil';

export interface FollowRequest {
  odinId: string;
  notificationType: 'allNotifications' | 'selectedChannels';
  channels?: TargetDrive[];
}

export interface UnfollowRequest {
  odinId: string;
}

const root = '/followers';

export const fetchFollowing = async (
  odinClient: OdinClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  const client = odinClient.createAxiosClient();

  const params = {
    cursor: cursorState,
    max: pageSize,
  };
  const url = root + `/IdentitiesIFollow?${stringifyToQueryParams(params)}`;

  return client
    .get(url)
    .then((response) => {
      return { results: response.data.results, cursorState: response.data.cursor };
    })
    .catch(odinClient.handleErrorResponse);
};

export const fetchIdentityIFollow = (
  odinClient: OdinClient,
  odinId: string
): Promise<FollowRequest> => {
  const client = odinClient.createAxiosClient();
  const url = root + `/IdentityIFollow?odinId=${odinId}`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const createOrUpdateFollow = async (
  odinClient: OdinClient,
  request: FollowRequest,
  synchronizeFeedHistoryNow?: boolean
): Promise<boolean | undefined> => {
  const client = odinClient.createAxiosClient();
  const url = root + `/follow`;

  return client
    .post(url, { ...request, synchronizeFeedHistoryNow })
    .then(() => {
      return true;
    })
    .catch((err) => {
      if (err?.response?.data?.errorCode === 'identityAlreadyFollowed') return true;
      return odinClient.handleErrorResponse(err);
    });
};

export const syncFeedHistoryForFollowing = async (
  odinClient: OdinClient,
  request: { odinId: string }
): Promise<boolean | undefined> => {
  const client = odinClient.createAxiosClient();
  const url = root + `/sync-feed-history`;

  return client
    .post(url, request)
    .then(() => {
      return true;
    })
    .catch(odinClient.handleErrorResponse);
};

export const Unfollow = async (
  odinClient: OdinClient,
  request: UnfollowRequest
): Promise<boolean | undefined> => {
  const client = odinClient.createAxiosClient();
  const url = root + `/unfollow`;

  return client
    .post(url, request)
    .then(() => {
      return true;
    })
    .catch(odinClient.handleErrorResponse);
};

export const fetchFollowers = async (
  odinClient: OdinClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  const client = odinClient.createAxiosClient();

  const params = {
    cursor: cursorState,
    max: pageSize,
  };
  const url = root + `/followingme?${stringifyToQueryParams(params)}`;

  return client
    .get(url)
    .then((response) => {
      return { results: response.data.results, cursorState: response.data.cursor };
    })
    .catch(odinClient.handleErrorResponse);
};

export const fetchFollower = async (
  odinClient: OdinClient,
  odinId: string
): Promise<FollowRequest> => {
  const client = odinClient.createAxiosClient();
  const url = root + `/follower?odinId=${odinId}`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const fetchFollowDetail = async (
  odinClient: OdinClient
): Promise<FollowRequest | null> => {
  const client = odinClient.createAxiosClient();

  const url = root + `/followerconfiguration`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};
