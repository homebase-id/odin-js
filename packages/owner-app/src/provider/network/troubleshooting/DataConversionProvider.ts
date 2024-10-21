import { DotYouClient } from '@homebase-id/js-lib/core';
import { assertIfDefined } from '@homebase-id/js-lib/helpers';

const dataConverionRoot = '/data-conversion';
export const autoFixConnections = async (dotYouClient: DotYouClient) => {
  assertIfDefined('DotYouClient is required', dotYouClient);

  const client = dotYouClient.createAxiosClient();
  return await client
    .post<unknown>(`${dataConverionRoot}/autofix-connections`, {})
    .then((response) => {
      if (response.status !== 200) {
        throw new Error('Auto fix connections failed with status ' + response.status);
      }
    })
    .catch(dotYouClient.handleErrorResponse);
};
