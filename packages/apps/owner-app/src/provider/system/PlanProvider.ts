import { DotYouClient } from '@homebase-id/js-lib/core';

/** How much the identity stores, against what its plan allows. Mirrors the server's `StorageUsage`. */
export interface StorageUsage {
  usedBytes: number;
  /** Null for unlimited */
  quotaBytes: number | null;
  /** Payload uploads are refused (507) while true */
  isOverQuota: boolean;
}

/** The identity's hosting plan and what it gives. Mirrors the server's `IdentityPlan` (odin-core docs/hosting-plans.md). */
export interface IdentityPlan {
  /** The plan the identity gets; null while the server has no plans */
  id: string | null;
  isDefault: boolean;
  /** Whether the identity has a public home page */
  publicWebPresence: boolean;
  storage: StorageUsage;
  /** The hosting provider's page for a bigger plan, for this identity (?id= added); null when it has none */
  upgradeUrl?: string | null;
}

/** GET /api/v2/plan. Null on a server from before hosting plans, which answers 404. */
export const getPlan = async (dotYouClient: DotYouClient): Promise<IdentityPlan | null> => {
  const client = dotYouClient.createAxiosClient();
  return client
    .get<IdentityPlan>(`${dotYouClient.getRoot()}/api/v2/plan`)
    .then((response) => response.data)
    .catch((error) => {
      if (error?.response?.status === 404) return null;
      throw error;
    });
};
