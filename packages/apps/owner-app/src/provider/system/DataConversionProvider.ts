import { DotYouClient} from '@homebase-id/js-lib/core';

export interface VersionInfoResult {
  requiresUpgrade: boolean;

  serverDataVersionNumber: number;

  /**
   * The version number of the data structure for this tenant
   */
  actualDataVersionNumber: number;

  lastUpgraded: number; // UnixTimeUtc → number (unix timestamp in seconds)

  failedDataVersionNumber?: number | null;

  lastAttempted?: number | null; // nullable UnixTimeUtc

  failedBuildVersion?: string | null;

  failureCorrelationId?: string | null;
}


//Handles management of the System
const root = '/data-conversion';

export const getDataVersionInfo = async (dotYouClient: DotYouClient) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/data-version-info';
  return client.get<VersionInfoResult>(url, {}).then((response) => {
    return response.data;
  });
};


export const forceVersionUpgrade = async (dotYouClient: DotYouClient) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/force-version-upgrade';
  return client.post(url, {}).then((response) => {
    return response.data;
  });
};
