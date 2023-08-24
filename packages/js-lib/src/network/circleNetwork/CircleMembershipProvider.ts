import { DotYouClient } from '../../core/DotYouClient';
import { CircleGrant } from './CircleDataTypes';

const connectionsRoot = '/circles/connections/circles';
const membershipRoot = '/circles/membership';

//Handles management of Circles
export const addMemberToCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { odinId: string; circleId: string }
) => {
  const client = dotYouClient.createAxiosClient();
  const url = connectionsRoot + '/add';

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
  const url = connectionsRoot + '/revoke';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export interface Membership {
  circleGrant: CircleGrant;
  domainType: 'identity' | 'youAuth';
  domain: string;
}

export const fetchMembersOfCircle = async (
  dotYouClient: DotYouClient,
  circleId: string
): Promise<Membership[]> => {
  const client = dotYouClient.createAxiosClient();
  const url = membershipRoot + '/list';

  return client
    .post<Membership[]>(url, { circleId: circleId })
    .then((response) => response.data)
    .catch((err) => {
      dotYouClient.handleErrorResponse(err);
      return [];
    });
};
