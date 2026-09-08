import { useEffect, useState } from 'react';
import { detectRegion, isRegion, Region } from '../../helpers/region';
import { regionRedirectUrl } from '../../helpers/regionRouting';

/**
 * Resolves the hosting region the way the sign-up flow does — an explicit
 * `?region=` outranks detection — and, when that region lives on a different
 * provisioning host, sends the browser there before the flow starts. Returns
 * whether a redirect is under way, so the caller can hold off rendering a flow
 * that is about to be replaced (and hold off calling a cluster that is about to
 * become the wrong one).
 *
 * Resolved once, on mount: a re-detect mid-flow would fight the user's choice.
 *
 * A *detected* region is deliberately not written into the redirect URL. The
 * target re-detects it from the same device and agrees, so there is no ping-pong,
 * and leaving it out keeps the guess correctable — a stale `?region=` outranks
 * detection on every later load.
 *
 * `replace`, not `assign`: Back would otherwise land on the host we just left and
 * be sent forward again.
 */
export const useRegionHostRouting = (): boolean => {
  const [redirectUrl] = useState<string | null>(() => {
    const param = new URLSearchParams(window.location.search).get('region');
    const region: Region | null = isRegion(param) ? param : detectRegion().region;

    return regionRedirectUrl(region);
  });

  useEffect(() => {
    if (redirectUrl) window.location.replace(redirectUrl);
  }, [redirectUrl]);

  return !!redirectUrl;
};
