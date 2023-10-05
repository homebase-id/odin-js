const LOCAL_STORAGE_PREV_IDENTITY_KEY = 'previousIdentity';

export const stripIdentity = (identity: string) => {
  return identity.replace(new RegExp('^(http|https)://'), '').split('/')[0].toLowerCase();
};

export const checkStorageAccess = async () => {
  try {
    let storagePartioned = !!document.requestStorageAccess; // Checks => https://developer.mozilla.org/en-US/docs/Web/Privacy/State_Partitioning#disable_dynamic_state_partitioning
    await (window.document.hasStorageAccess &&
      window.document.hasStorageAccess().then((hasAccess) => {
        storagePartioned = !hasAccess;
      }));

    return storagePartioned;
  } catch (ex) {
    console.debug('window.document.hasStorageAccess is not accessible');
    return false;
  }
};

export const requestStorageAccess = async () => {
  return new Promise<void>((resolve) => {
    try {
      if (window.document.requestStorageAccess) {
        window.document
          .requestStorageAccess()
          .then(resolve, () => {
            // Ignore success; this is just a best-effort attempt to get storage access
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

export const getIdentityFromStorage = () => {
  try {
    const previousIdentity = window.localStorage.getItem(LOCAL_STORAGE_PREV_IDENTITY_KEY);
    return previousIdentity;
  } catch (ex) {
    console.debug('window.localStorage is not accessible');
    return '';
  }
};

export const storeIdentityAndAuthorize = (identity: string, params?: URLSearchParams) => {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_PREV_IDENTITY_KEY, identity);
  } catch (ex) {
    console.debug('window.localStorage is not accessible');
  }

  if (!window.top) throw new Error('window.top is not accessible');

  const parentUrl =
    window.location != window.parent.location ? document.referrer : document.location.href;

  // Point to owner login if the identity is the same as the host we're on
  if (stripIdentity(parentUrl) === identity)
    window.top.location.href = `https://${identity}/owner/login?returnUrl=/owner`;
  else
    window.top.location.href = `https://${identity}/api/owner/v1/youauth/authorize?${params?.toString()}`;
};
