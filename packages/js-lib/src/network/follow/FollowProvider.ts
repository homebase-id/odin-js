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

const root = '/followers';

export const fetchFollowing = async (
  dotYouClient: DotYouClient,
  cursorState?: string,
  pageSize?: number
): Promise<CursoredResult<string[]> | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const currentRoot = dotYouClient.getType() === ApiType.Owner ? root : `/circles${root}`;

  const params = {
    cursor: cursorState,
    max: pageSize,
  };
  const url = currentRoot + `/IdentitiesIFollow?${stringifyToQueryParams(params)}`;

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
  request: FollowRequest
): Promise<boolean | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/follow`;

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
  const currentRoot = dotYouClient.getType() === ApiType.Owner ? root : `/circles${root}`;

  const params = {
    cursor: cursorState,
    max: pageSize,
  };
  const url = currentRoot + `/followingme?${stringifyToQueryParams(params)}`;

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

  const currentRoot = dotYouClient.getType() === ApiType.Owner ? root : `/circles${root}`;
  const url = currentRoot + `/followerconfiguration`;

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
