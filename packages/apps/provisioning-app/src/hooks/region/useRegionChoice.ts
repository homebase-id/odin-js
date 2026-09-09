import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { detectRegion, isRegion, Region, RegionSource } from '../../helpers/region';
import { regionRedirectUrl } from '../../helpers/regionRouting';

/**
 * The hosting region as a sign-up flow sees it, and the only way to change it.
 *
 * Resolved once, on mount — an explicit `?region=` outranks detection — because
 * a re-detect mid-flow would fight the user's choice.
 *
 * Picking another region is not a state update: another region is another
 * cluster, and a cluster answers only for itself — its own registry, its own
 * nameservers, its own IP addresses in the DNS instructions. So the rest of the
 * flow has to run on the host that will own the identity, and `chooseRegion`
 * moves the browser there. See helpers/regionRouting.ts.
 *
 * Only an explicit choice is mirrored into the URL. Persisting a detected region
 * would freeze one guess forever: a stale `?region=` from an earlier visit
 * outranks detection on every later load, so a wrong guess could never correct
 * itself.
 */
export const useRegionChoice = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [{ region, source }, setChoice] = useState<{
    region: Region | null;
    source: RegionSource | null;
  }>(() => {
    const param = searchParams.get('region');
    return isRegion(param) ? { region: param, source: null } : detectRegion();
  });

  /**
   * `carry` holds whatever the user has typed so far, so a redirect does not
   * drop them back onto an empty form. It rides in the URL of the *redirect
   * only*: it exists to survive a full page load onto another origin, and left
   * in the address bar of a host that did not move it would resurrect a stale
   * value on the next reload. Carried values are restored, never trusted — the
   * cluster that vetted them is the one being left.
   */
  const chooseRegion = (next: Region, carry?: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set('region', next);

    const carried = new URLSearchParams(params);
    for (const [key, value] of Object.entries(carry ?? {})) if (value) carried.set(key, value);

    const redirectUrl = regionRedirectUrl(next, `?${carried}`);
    if (redirectUrl) {
      window.location.replace(redirectUrl);
      return;
    }

    setChoice({ region: next, source: null });
    setSearchParams(params, { replace: true });
  };

  return { region, source, chooseRegion };
};
