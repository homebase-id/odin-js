const LOCAL_STORAGE_PREV_IDENTITY_KEY = 'previousIdentity';

export const stripIdentity = (identity: string) => {
  return identity.replace(new RegExp('^(http|https)://'), '').split('/')[0].toLowerCase();
};

// https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API/Using
export const isPartitioned = async () => {
  if (!document.hasStorageAccess) {
    // Browser doesn't support Storage Access API
    console.debug('document.hasStorageAccess is not accessible');
    return false;
  }

  const hasAccess = await document.hasStorageAccess();
  console.debug('document.hasStorageAccess', hasAccess);
  if (hasAccess) return false;

  try {
    const permission = await navigator.permissions.query({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: 'storage-access' as any,
    });

    console.debug('other embed with access we can re-use', permission.state);
    if (permission.state === 'granted') {
      return false;
    }
  } catch (ex) {
    //
  }

  return true;
};

export const requestStorageAccess = async () => {
  return new Promise<void>((resolve) => {
    try {
      if (window.document.requestStorageAccess) {
        console.debug('window.document.requestStorageAccess');
        window.document
          .requestStorageAccess()
          .then(resolve, () => {
            // Ignore reject; this is just a best-effort attempt to get storage access
            resolve();
          })
          .catch(() => {
            // Ignore errors; this is just a best-effort attempt to get storage access
            resolve();
          });
      }
    } catch (ex) {
      // Ignore errors; this is just a best-effort attempt to get storage access
      resolve();
    }
  });
};

export const getIdentityFromStorage: () => string[] = () => {
  try {
    const storageValue = window.localStorage.getItem(LOCAL_STORAGE_PREV_IDENTITY_KEY);
    if (!storageValue) return [];
    try {
      const identties: string[] = JSON.parse(storageValue);
      if (Array.isArray(identties)) return identties;
    } catch (ex) {
      //
    }
    return [storageValue];
  } catch (ex) {
    console.debug('window.localStorage is not accessible');
    return [];
  }
};

export const storeIdentity = (identity: string) => {
  try {
    const previousIdentities = getIdentityFromStorage();
    window.localStorage.setItem(
      LOCAL_STORAGE_PREV_IDENTITY_KEY,
      JSON.stringify([...new Set([identity, ...previousIdentities])])
    );
  } catch (ex) {
    console.debug('window.localStorage is not accessible');
  }
};

export const removeIdentity = (identity: string) => {
  try {
    const previousIdentities = getIdentityFromStorage();
    window.localStorage.setItem(
      LOCAL_STORAGE_PREV_IDENTITY_KEY,
      JSON.stringify([...previousIdentities.filter((id) => id !== identity)])
    );
  } catch (ex) {
    console.debug('window.localStorage is not accessible');
  }
};

export const authorize = async (identity: string, params: URLSearchParams) => {
  if (!window.top) throw new Error('window.top is not accessible');

  if (!identity || identity === '') {
    window.top.location.href = `https://${window.location.host}/auth/owner/v1/youauth/authorize?${params.toString()}`;
    return;
  }

  const parentUrl =
    window.location != window.parent.location ? document.referrer : document.location.href;

  // Point to owner login if the identity is the same as the host we're on
  // But don't do this if it's an app running on the owner host
  if (stripIdentity(parentUrl) === identity && !window.location.pathname.includes('anonymous-apps'))
    window.top.location.href = `https://${identity}/owner/login?returnUrl=/owner`;
  else
    window.top.location.href = `https://${identity}/api/owner/v1/youauth/authorize?${params.toString()}`;
};
