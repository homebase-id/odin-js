import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { detectRegion, isRegion, Region, RegionSource } from '../../helpers/region';
import { regionRedirectUrl } from '../../helpers/regionRouting';
import { carriedFragmentFor, clearCarriedFragment } from '../../helpers/carriedFragment';

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
   * `carry` and `carryInFragment` hold whatever the user has typed so far, so a
   * redirect does not drop them back onto an empty form. Both ride in the URL of
   * the *redirect only*: they exist to survive a full page load onto another
   * origin, and left in the address bar of a host that did not move they would
   * resurrect a stale value on the next reload. Carried values are restored,
   * never trusted — the cluster that vetted them is the one being left.
   *
   * The split is where each value is allowed to be seen. A query string reaches
   * the target cluster and its access log; a fragment reaches neither, and is
   * where anything personal goes. See helpers/carriedFragment.ts.
   */
  const chooseRegion = (
    next: Region,
    carried?: {
      carry?: Record<string, string | null>;
      carryInFragment?: Record<string, string | null>;
    }
  ) => {
    const params = new URLSearchParams(searchParams);
    params.set('region', next);

    const redirectParams = new URLSearchParams(params);
    for (const [key, value] of Object.entries(carried?.carry ?? {}))
      if (value) redirectParams.set(key, value);

    const redirectUrl = regionRedirectUrl(
      next,
      `?${redirectParams}`,
      carriedFragmentFor(carried?.carryInFragment ?? {})
    );
    if (redirectUrl) {
      window.location.replace(redirectUrl);
      return;
    }

    setChoice({ region: next, source: null });
    setSearchParams(params, { replace: true });
  };

  // Whatever arrived in the fragment has been snapshotted by now (module load),
  // so the address bar can be cleaned as soon as this mounts. Not conditional on
  // having consumed anything: a fragment nobody restored is still stale.
  useEffect(() => clearCarriedFragment(), []);

  return { region, source, chooseRegion };
};
