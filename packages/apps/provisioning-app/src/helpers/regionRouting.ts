import { config } from '../app/config';
import { Region } from './region';

/**
 * The router is DNS, and this app is what picks the name.
 *
 * odin-core has no concept of regions: provisioning is selected purely by Host
 * header (`Registry:ProvisioningDomain`), and a cluster knows nothing of any
 * other cluster — separate registries, separate databases. There is nothing for
 * a server to forward a registration to, so the region the user picks can only
 * be honoured by moving them to a different hostname.
 *
 * That is why the *whole* flow moves rather than just the create call: the
 * availability lookup queries one cluster's registry, so checking a name in
 * Europe and creating it in Canada could report a name free when it is not.
 */
export const provisioningHostForRegion = (region: Region): string | undefined =>
  config.provisioningHosts[region];

/**
 * Only hosts this build knows how to route *between* may be routed away from.
 * Everything else — dev.dotyou.cloud, a preview deploy, a self-hosted
 * provisioning domain — is left alone: throwing those at a production host
 * would be worse than not routing at all.
 */
const isRoutableHost = (hostname: string): boolean =>
  Object.values(config.provisioningHosts).includes(hostname);

/**
 * Absolute URL for this same page on the region's provisioning host, or null
 * when there is nothing to do: no region resolved yet, no host mapped for it,
 * a host this build does not route, or the user is already in the right place.
 *
 * Only the host changes — path, invitation code, plan, returnUrl and region all
 * ride along untouched. Pass `search` to route on a query string that is about
 * to be applied rather than the one currently in the address bar.
 */
export const regionRedirectUrl = (
  region: Region | null,
  search: string = window.location.search
): string | null => {
  if (!region) return null;

  const target = provisioningHostForRegion(region);
  const { hostname, pathname, hash } = window.location;
  if (!target || target === hostname || !isRoutableHost(hostname)) return null;

  return `https://${target}${pathname}${search}${hash}`;
};
