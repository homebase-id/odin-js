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

const V1_AUTHORIZE_PATH = '/api/owner/v1/youauth/authorize';
const V2_AUTHORIZE_PATH = '/api/v2/youauth/authorize';

/**
 * Where the consent form posts: the route the sign-in started on, the one in its return URL. The identity refuses a
 * return URL with any path but the one it was posted to, and a sign-in from chat-kmp or a third-party app comes in on V1.
 */
export const getConsentFormAction = (returnUrl: string): string => {
  try {
    return new URL(returnUrl).pathname === V2_AUTHORIZE_PATH ? V2_AUTHORIZE_PATH : V1_AUTHORIZE_PATH;
  } catch {
    return V1_AUTHORIZE_PATH;
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
