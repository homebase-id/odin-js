import { OdinClient } from '@homebase-id/js-lib/core';
import { assertIfDefined } from '@homebase-id/js-lib/helpers';

const dataConverionRoot = '/data-conversion';
export const autoFixConnections = async (odinClient: OdinClient) => {
  assertIfDefined('OdinClient is required', odinClient);

  const client = odinClient.createAxiosClient();
  return await client
    .post<unknown>(`${dataConverionRoot}/autofix-connections`, {})
    .then((response) => {
      if (response.status !== 200) {
        throw new Error('Auto fix connections failed with status ' + response.status);
      }
    })
    .catch(odinClient.handleErrorResponse);
};
