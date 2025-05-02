import { OdinClient } from '../../core/OdinClient';
import { CircleGrant } from './CircleDataTypes';

const connectionsRoot = '/circles/connections/circles';
const membershipRoot = '/circles/membership';

//Handles management of Circles
export const addMemberToCircle = async (
  odinClient: OdinClient,
  membershipGrant: { odinId: string; circleId: string }
) => {
  const client = odinClient.createAxiosClient();
  const url = connectionsRoot + '/add';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const removeMemberFromCircle = async (
  odinClient: OdinClient,
  membershipGrant: { odinId: string; circleId: string }
) => {
  const client = odinClient.createAxiosClient();
  const url = connectionsRoot + '/revoke';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export interface Membership {
  circleGrant: CircleGrant;
  domainType: 'identity' | 'youAuth';
  domain: string;
}

export const fetchMembersOfCircle = async (
  odinClient: OdinClient,
  circleId: string
): Promise<Membership[]> => {
  const client = odinClient.createAxiosClient();
  const url = membershipRoot + '/list';

  return client
    .post<Membership[]>(url, { circleId: circleId })
    .then((response) => response.data)
    .catch((err) => {
      odinClient.handleErrorResponse(err);
      return [];
    });
};
