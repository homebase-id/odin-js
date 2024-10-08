import { DotYouClient } from '../../core/DotYouClient';
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
  dotYouClient: DotYouClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  const client = dotYouClient.createAxiosClient();

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
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchIdentityIFollow = (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<FollowRequest> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/IdentityIFollow?odinId=${odinId}`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const createOrUpdateFollow = async (
  dotYouClient: DotYouClient,
  request: FollowRequest,
  synchronizeFeedHistoryNow?: boolean
): Promise<boolean | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/follow`;

  return client
    .post(url, { ...request, synchronizeFeedHistoryNow })
    .then(() => {
      return true;
    })
    .catch((err) => {
      if (err?.response?.data?.errorCode === 'identityAlreadyFollowed') return true;
      return dotYouClient.handleErrorResponse(err);
    });
};

export const syncFeedHistoryForFollowing = async (
  dotYouClient: DotYouClient,
  request: { odinId: string }
): Promise<boolean | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/sync-feed-history`;

  return client
    .post(url, request)
    .then(() => {
      return true;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const Unfollow = async (
  dotYouClient: DotYouClient,
  request: UnfollowRequest
): Promise<boolean | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/unfollow`;

  return client
    .post(url, request)
    .then(() => {
      return true;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchFollowers = async (
  dotYouClient: DotYouClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  const client = dotYouClient.createAxiosClient();

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
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchFollower = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<FollowRequest> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/follower?odinId=${odinId}`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchFollowDetail = async (
  dotYouClient: DotYouClient
): Promise<FollowRequest | null> => {
  const client = dotYouClient.createAxiosClient();

  const url = root + `/followerconfiguration`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
