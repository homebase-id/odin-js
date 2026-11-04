import { ApiType, DotYouClient } from '../../core/DotYouClient';
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

// The same root on V1 and V2 (/api/v2/followers); V2's action names are kebab-case
const root = '/followers';

/** One entry of V2's follow lists; V1 answered bare odinIds */
interface FollowEntry {
  odinId: string;
  followedAt?: number | null;
}

/**
 * V2's follow reads are open to the owner, an app and a signed-in visitor; V1's guest API also
 * answers an anonymous visitor (when the owner lets anyone see who they follow), so an anonymous
 * guest stays on V1.
 */
const readsOnV2 = (dotYouClient: DotYouClient) =>
  dotYouClient.getType() !== ApiType.Guest || dotYouClient.isAuthenticated();

/** V2's follow writes are owner-or-app only; a guest keeps V1, which refuses it as before */
const writesOnV2 = (dotYouClient: DotYouClient) => dotYouClient.getType() !== ApiType.Guest;

export const fetchFollowing = async (
  dotYouClient: DotYouClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  if (readsOnV2(dotYouClient)) {
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
  }

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
  const v2 = readsOnV2(dotYouClient);
  const client = dotYouClient.createAxiosClient({ v2 });
  const url =
    root + (v2 ? `/identity-i-follow?odinId=${odinId}` : `/IdentityIFollow?odinId=${odinId}`);

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
  const client = dotYouClient.createAxiosClient({ v2: writesOnV2(dotYouClient) });
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
  const client = dotYouClient.createAxiosClient({ v2: writesOnV2(dotYouClient) });
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
  const client = dotYouClient.createAxiosClient({ v2: writesOnV2(dotYouClient) });
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
  if (readsOnV2(dotYouClient)) {
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
  }

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
  const client = dotYouClient.createAxiosClient({ v2: readsOnV2(dotYouClient) });
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
  const v2 = readsOnV2(dotYouClient);
  const client = dotYouClient.createAxiosClient({ v2 });

  const url = root + (v2 ? `/follower-configuration` : `/followerconfiguration`);

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
