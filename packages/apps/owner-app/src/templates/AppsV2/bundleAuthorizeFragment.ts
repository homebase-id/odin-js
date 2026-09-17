/**
 * The bundle consent request travels in the URL fragment (`/owner/bundle-tokens/authorize#p=`), and
 * the login redirect in RootRoute keeps only pathname + search. So the fragment is stashed in
 * sessionStorage as soon as the owner app loads -- before RootRoute can navigate away -- and the
 * consent page reads it back when it arrives without one (i.e. after logging in, in the same tab).
 */
export const BUNDLE_AUTHORIZE_PATH = '/owner/bundle-tokens/authorize';
const STORAGE_KEY = 'bundle-authorize-fragment';

export const stashBundleAuthorizeFragment = () => {
  try {
    if (
      typeof window === 'undefined' ||
      !window.location.pathname.startsWith(BUNDLE_AUTHORIZE_PATH) ||
      !new URLSearchParams(window.location.hash.replace(/^#/, '')).get('p')
    )
      return;
    sessionStorage.setItem(STORAGE_KEY, window.location.hash);
  } catch {
    // sessionStorage unavailable: the fragment still works when the owner is already logged in.
  }
};

export const readStashedBundleAuthorizeFragment = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const clearStashedBundleAuthorizeFragment = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

stashBundleAuthorizeFragment();
