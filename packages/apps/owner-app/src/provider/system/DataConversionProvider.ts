import { DotYouClient} from '@homebase-id/js-lib/core';

/**
 * What the identity's data upgrade is doing. Mirrors the server's `UpgradeState`.
 *
 * `pending` is the state neither of the old booleans could name: an upgrade is scheduled when the
 * owner authenticates but does not start until a job picks it up, and a sign-in lands in exactly
 * that window. `failed` is the other one -- the version stays behind and nothing is running, which
 * is indistinguishable from `pending` unless you also ask about failures.
 */
export type UpgradeState = 'upToDate' | 'pending' | 'running' | 'failed';

export interface VersionInfoResult {
  upgradeState: UpgradeState;

  /** @deprecated The version comparison alone. Use {@link VersionInfoResult.upgradeState}. */
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

/**
 * The one endpoint the upgrade guard leaves open, and the one call that answers what the upgrade is
 * doing -- `upgradeState` covers what used to take this call plus a second one for a response
 * header.
 */
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

export interface TenantVersionInfo {
  dataVersionNumber: number;
  lastUpgraded: number;
}

/**
 * Forces the tenant's data version number to the given value; this also clears
 * any recorded upgrade failure. Setting it lower than the server's data version
 * will cause the upgrade steps from that version onwards to run again.
 */
export const forceVersionNumber = async (dotYouClient: DotYouClient, version: number) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/force-version-number';
  return client
    .post<TenantVersionInfo>(url, {}, { params: { version } })
    .then((response) => {
      return response.data;
    });
};
