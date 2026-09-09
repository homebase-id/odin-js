/**
 * The values a region redirect carries in the URL *fragment*.
 *
 * The fragment is the one part of a URL a browser never sends: it does not reach
 * the target cluster, its access log, or a Referer header. That is what makes it
 * the right place for the email. Putting an address in the query string — beside
 * the carried domain — is precisely what #918 refused to do, and the objection
 * stands; the fragment answers it rather than overruling it.
 *
 * Snapshotted at module load, before React has rendered anything: StrictMode
 * remounts a component after its first effects have run, re-running the useState
 * initializers that read this. A live read would come back empty on that second
 * pass and drop the very value the redirect carried.
 */
const carried = new URLSearchParams(window.location.hash.slice(1));

export const readCarriedFragment = (name: string): string | null => carried.get(name);

/**
 * The fragment as it should ride on a redirect URL, or '' when there is nothing
 * to carry. Empty values are dropped rather than sent as `email=`.
 */
export const carriedFragmentFor = (values: Record<string, string | null | undefined>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);

  const fragment = params.toString();
  return fragment ? `#${fragment}` : '';
};

/**
 * Consumed once. Left in the address bar it would outlive the page load it was
 * made for — surviving a reload and outranking whatever the user had typed since
 * — which is the same reason the carried `claim` and `domain` are stripped from
 * the query. replaceState, so Back cannot return to a URL still carrying it.
 *
 * The snapshot above is deliberately unaffected: it is what the flow restores
 * from, and it must outlive the address bar being cleaned.
 */
export const clearCarriedFragment = (): void => {
  if (!window.location.hash) return;

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
};
