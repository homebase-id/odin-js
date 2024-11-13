import { LoginBox } from '../components/loginBox';
import { RedirectBox } from '../components/redirectBox';
import { getIdentityFromStorage, requestStorageAccess } from '../helpers/identity';

export const Redirect = () => {
  // 1. Parse target URL
  const pathName = window.location.pathname + window.location.search;
  const rawTarget = pathName.split('/redirect')[1];
  if (!rawTarget) return;

  const allowedToAutoRedirect = ['/owner'];

  const target = (() => {
    if (rawTarget.startsWith('/owner')) return rawTarget;
    if (!rawTarget.startsWith('/app')) return `/owner${rawTarget}`;

    return rawTarget;
  })();

  // 2. Get identity
  const getIdentity = () => {
    return new Promise<string>((resolve) => {
      requestStorageAccess()
        .then(() => {
          const previousIdentities = getIdentityFromStorage();

          if (previousIdentities?.length === 1) {
            resolve(previousIdentities[0]);
          } else LoginBox(resolve, true);
        })
        .catch(() => {
          LoginBox(resolve, true);
        });
    });
  };

  // 3. Redirect or show redirect box
  const redirect = async () => {
    const identity = await getIdentity();
    window.location.href = `https://${identity}${target}`;
  };

  if (allowedToAutoRedirect.some((allowed) => target.startsWith(allowed))) redirect();
  else
    RedirectBox(
      target,
      () => redirect(),
      () => history.back()
    );
};
