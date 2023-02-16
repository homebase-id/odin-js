import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/DriveData/DriveTypes';
import { CursoredResult } from '../../core/Types';

export interface FollowRequest {
  dotYouId: string;
  notificationType: 'allNotifications';
  channels?: TargetDrive[];
}

export interface UnfollowRequest {
  dotYouId: string;
}
const root = '/followers';

export const fetchFollowing = async (
  dotYouClient: DotYouClient,
  cursorState?: string
): Promise<CursoredResult<string[]> | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/IdentitiesIFollow${cursorState ? '?cursor=' + cursorState : ''}`;

  return client
    .get(url)
    .then((response) => {
      return { results: response.data.results, cursorState: response.data.cursor };
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchIdentityIFollow = (
  dotYouClient: DotYouClient,
  dotYouId: string
): Promise<FollowRequest> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/IdentityIFollow?dotYouId=${dotYouId}`;

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
  cursorState?: string
): Promise<CursoredResult<string[]> | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + `/followingme${cursorState ? '?cursor=' + cursorState : ''}`;

  return client
    .get(url)
    .then((response) => {
      return { results: response.data.results, cursorState: response.data.cursor };
    })
    .catch(dotYouClient.handleErrorResponse);
};
