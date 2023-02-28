import { DotYouClient } from '../../core/DotYouClient';

const root = '/circles/connections/circles';

//Handles management of Circles
export const addMemberToCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { odinId: string; circleId: string }
) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/add';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const removeMemberFromCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { odinId: string; circleId: string }
) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/revoke';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const fetchMembersOfCircle = async (
  dotYouClient: DotYouClient,
  circleId: string
): Promise<string[]> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/list';

  return client
    .post(url, { circleId: circleId })
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
