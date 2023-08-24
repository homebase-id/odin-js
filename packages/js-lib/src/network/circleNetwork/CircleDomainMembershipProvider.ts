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
