import { DotYouClient } from '../../core/DotYouClient';

const root = '/youauthdomain';

//Fetches all identities and domains
export const fetchAllConnections = async (dotYouClient: DotYouClient): Promise<string[]> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/list';

  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

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
