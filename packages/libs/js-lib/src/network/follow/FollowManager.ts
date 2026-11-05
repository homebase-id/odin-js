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

/** One entry of the follow lists */
interface FollowEntry {
  odinId: string;
  followedAt?: number | null;
}

export const fetchFollowing = async (
  dotYouClient: DotYouClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const params = { cursor: cursorState, count: pageSize };
  const url = root + `/identities-i-follow?${stringifyToQueryParams(params)}`;

  return client
    .get<{ results: FollowEntry[]; cursor: string }>(url)
    .then((response) => ({
      results: (response.data.results || []).map((entry) => entry.odinId),
      cursorState: response.data.cursor,
    }))
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchIdentityIFollow = (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<FollowRequest> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = root + `/identity-i-follow?odinId=${odinId}`;

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
  const client = dotYouClient.createAxiosClient({ v2: true });
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
  const client = dotYouClient.createAxiosClient({ v2: true });
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
  const client = dotYouClient.createAxiosClient({ v2: true });
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
  const client = dotYouClient.createAxiosClient({ v2: true });
  const params = { cursor: cursorState, count: pageSize };
  const url = root + `/following-me?${stringifyToQueryParams(params)}`;

  return client
    .get<{ results: FollowEntry[]; cursor: string }>(url)
    .then((response) => ({
      results: (response.data.results || []).map((entry) => entry.odinId),
      cursorState: response.data.cursor,
    }))
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchFollower = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<FollowRequest> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
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
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = root + `/follower-configuration`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
