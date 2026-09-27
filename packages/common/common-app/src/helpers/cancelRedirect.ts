/**
 * Where to send the browser when the owner declines a relying party's request: the relying party's
 * own redirect URI with `error=cancelled-by-user`, and its `state` when the request carried one,
 * added to whatever query it already has. The identity does the same on its own error redirects;
 * dropping the existing query or the state leaves the relying party unable to match the
 * cancellation to the request it made.
 */
export const getCancelRedirectUrl = (redirectUri: string, state?: string | null): string => {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'cancelled-by-user');
    if (state) url.searchParams.set('state', state);
    return url.href;
  } catch {
    // Not an absolute URL; append by hand, in front of any fragment.
    const [base, ...fragment] = redirectUri.split('#');
    const params = new URLSearchParams({ error: 'cancelled-by-user' });
    if (state) params.set('state', state);
    const separator = !base.includes('?') ? '?' : /[?&]$/.test(base) ? '' : '&';
    return `${base}${separator}${params.toString()}${fragment.length ? `#${fragment.join('#')}` : ''}`;
  }
};

/** The `state` query parameter of `url`, or undefined when it has none or is not a URL. */
export const getStateParam = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).searchParams.get('state') || undefined;
  } catch {
    return undefined;
  }
};
