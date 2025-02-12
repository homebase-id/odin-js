import { LoginBox } from '../components/loginBox';
import { RedirectBox } from '../components/redirectBox';

export const Redirect = () => {
  document.documentElement.classList.toggle(
    'dark',
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

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
  const getIdentity = () => new Promise<string>((resolve) => LoginBox(resolve, true));

  // TODO: Make it a config option to directly redirect to the target
  // const getIdentity = () => {
  //   return new Promise<string>((resolve) => {
  //     requestStorageAccess()
  //       .then(() => {
  //         const previousIdentities = getIdentityFromStorage();

  //         if (previousIdentities?.length === 1) {
  //           resolve(previousIdentities[0]);
  //         } else LoginBox(resolve, true);
  //       })
  //       .catch(() => {
  //         LoginBox(resolve, true);
  //       });
  //   });
  // };

  // 3. Redirect or show redirect box
  const redirect = async (identity?: string) => {
    const href = `https://${identity || (await getIdentity())}${target}`;
    window.location.href = href;
  };

  if (allowedToAutoRedirect.some((allowed) => target.startsWith(allowed))) redirect();
  else RedirectBox(target, redirect);
};
