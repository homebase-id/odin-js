import { DotYouClient } from '../../core/DotYouClient';
import { CircleGrant } from './CircleDataTypes';

// V2: /api/v2/connections/circles
const connectionsRootV2 = '/connections/circles';
// V2's connections/circles lists a circle's identities, not its domains; this returns both
const membershipRoot = '/connections/circles/membership';

//Handles management of Circles
export const removeMemberFromCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { odinId: string; circleId: string }
) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = connectionsRootV2 + '/revoke';

  return client
    .post(url, membershipGrant)
    .then(() => true) // V2 answers an empty 200; V1 answered true
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
  const client = dotYouClient.createAxiosClient({ v2: true });
  const url = membershipRoot + '/list';

  return client
    .post<Membership[]>(url, { circleId: circleId })
    .then((response) => response.data)
    .catch((err) => {
      dotYouClient.handleErrorResponse(err);
      return [];
    });
};
