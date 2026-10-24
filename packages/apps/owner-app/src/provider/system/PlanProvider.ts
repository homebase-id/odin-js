import { DotYouClient } from '@homebase-id/js-lib/core';

/** How much the identity stores, against what its plan allows. Mirrors the server's `StorageUsage`. */
export interface StorageUsage {
  usedBytes: number;
  /** Null only from servers before plans moved onto the identity, where null meant unlimited */
  quotaBytes: number | null;
  /** Payload uploads are refused (507) while true */
  isOverQuota: boolean;
}

/** Who hosts the identity, and where to get a bigger plan from them. Mirrors the server's `HostingProviderInfo`. */
export interface HostingProvider {
  displayName: string;
  /** The provider's upgrade page for this identity, ready to open; null when it has none */
  upgradeUrl?: string | null;
}

/** The identity's plan and what it gives. Mirrors the server's `IdentityPlan` (odin-core docs/hosting-plans.md). */
export interface IdentityPlan {
  /** The plan Id the hosting provider gave the identity; null when it has none */
  id: string | null;
  /** Whether the identity has a public home page */
  publicWebPresence: boolean;
  storage: StorageUsage;
  /** Null when no hosting provider is configured (self-hosted) */
  hostingProvider?: HostingProvider | null;
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
