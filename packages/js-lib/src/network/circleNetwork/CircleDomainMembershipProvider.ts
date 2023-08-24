import { DotYouClient } from '../../core/DotYouClient';

const root = '/youauthdomain';

export const removeDomainFromCircle = async (
  dotYouClient: DotYouClient,
  membershipGrant: { domain: string; circleId: string }
) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/circles/revoke';

  return client
    .post(url, membershipGrant)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
