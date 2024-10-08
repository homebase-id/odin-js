import { ApiType, DotYouClient } from '../../core/DotYouClient';

const root = '/youauthdomain';

export const removeDomainFromCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { domain: string; circleId: string }
) => {
  if (dotYouClient.getType() !== ApiType.Owner) {
    throw new Error('Only owner can get domains');
  }

  const client = dotYouClient.createAxiosClient();
  const url = root + '/circles/revoke';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const addDomainToCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { domain: string; circleId: string }
) => {
  if (dotYouClient.getType() !== ApiType.Owner) {
    throw new Error('Only owner can get domains');
  }

  const client = dotYouClient.createAxiosClient();
  const url = root + '/circles/add';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
