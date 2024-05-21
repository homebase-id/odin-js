import { LoginBox } from '../components/loginBox';
import { getIdentityFromStorage, requestStorageAccess } from '../helpers/identity';

export const Redirect = () => {
  // 1. Parse target URL
  const pathName = window.location.pathname;
  const target = pathName.split('/redirect/')[1];
  if (!target) return;

  // 2. Get identity from local storage; Or if not found, show a login box
  requestStorageAccess().then(() => {
    const previousIdentities = getIdentityFromStorage();

    if (previousIdentities?.length === 1) {
      window.location.href = `https://${previousIdentities[0]}/owner/${target}`;
    } else
      LoginBox((identity) => (window.location.href = `https://${identity}/owner/${target}`), true);
  });
};
