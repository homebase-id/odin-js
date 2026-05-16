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

export interface UpgradeStatus {
  /** Whether the current owner token is valid */
  isValidToken: boolean;

  /** The `X-REQUIRES-UPGRADE` response header is `True`: a data upgrade is required */
  requiresUpgrade: boolean;

  /** The `X-UPGRADE-RUNNING` response header is `True`: a data upgrade is in progress */
  upgradeRunning: boolean;
}

const isHeaderTrue = (value: string | undefined): boolean =>
  typeof value === 'string' && value.toLowerCase() === 'true';

// Reads a response header case-insensitively, supporting both the axios
// `AxiosHeaders` object (with `.get()`) and a plain header record.
const readHeader = (headers: unknown, name: string): string | undefined => {
  if (!headers || typeof headers !== 'object') return undefined;

  const getter = (headers as { get?: (headerName: string) => unknown }).get;
  if (typeof getter === 'function') {
    const value = getter.call(headers, name);
    return value == null ? undefined : String(value);
  }

  const lowerName = name.toLowerCase();
  const record = headers as Record<string, unknown>;
  const match = Object.keys(record).find((key) => key.toLowerCase() === lowerName);
  return match !== undefined ? String(record[match]) : undefined;
};

/**
 * Calls the owner verify-token endpoint and reads the data-upgrade signalling
 * headers from the response:
 *  - `X-REQUIRES-UPGRADE` -> a data version upgrade is required before the identity can be used
 *  - `X-UPGRADE-RUNNING`  -> a data version upgrade is currently running
 */
export const getUpgradeStatus = async (dotYouClient: DotYouClient): Promise<UpgradeStatus> => {
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  // validateStatus lets us inspect the headers even when the token is rejected.
  const response = await client.get('/authentication/verifyToken', {
    validateStatus: () => true,
  });

  return {
    isValidToken: response.status === 200 && response.data === true,
    requiresUpgrade: isHeaderTrue(readHeader(response.headers, 'X-REQUIRES-UPGRADE')),
    upgradeRunning: isHeaderTrue(readHeader(response.headers, 'X-UPGRADE-RUNNING')),
  };
};
