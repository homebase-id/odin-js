import { ApiType, OdinClient } from '../../core/OdinClient';

const root = '/youauthdomain';

export const removeDomainFromCircle = async (
  odinClient: OdinClient,
  membershipGrant: { domain: string; circleId: string }
) => {
  if (odinClient.getType() !== ApiType.Owner) {
    throw new Error('Only owner can get domains');
  }

  const client = odinClient.createAxiosClient();
  const url = root + '/circles/revoke';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};

export const addDomainToCircle = async (
  odinClient: OdinClient,
  membershipGrant: { domain: string; circleId: string }
) => {
  if (odinClient.getType() !== ApiType.Owner) {
    throw new Error('Only owner can get domains');
  }

  const client = odinClient.createAxiosClient();
  const url = root + '/circles/add';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(odinClient.handleErrorResponse);
};
