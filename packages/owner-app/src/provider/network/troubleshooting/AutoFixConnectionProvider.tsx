import { DotYouClient } from '@youfoundation/js-lib/core';
import { assertIfDefined } from '@youfoundation/js-lib/helpers';

const autoFixPath = '/circles/connections/autofix';
export const autoFixConnections = async (dotYouClient: DotYouClient) => {
  assertIfDefined('DotYouClient is required', dotYouClient);

  const client = dotYouClient.createAxiosClient();
  return await client.post<unknown>(autoFixPath, {}).catch(dotYouClient.handleErrorResponse);
};
