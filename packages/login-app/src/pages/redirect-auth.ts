import { LoginBox } from '../components/loginBox';
import { stripIdentity } from '../helpers/identity';

export const RedirectAuth = () => {
  // 1. Parse target URL
  const pathName = window.location.pathname;
  const target = pathName.split('/auth/')[1];
  if (!target) return;

  const params = window.location.search;

  const urlSearchParams = new URLSearchParams(params);
  const CLIENT_ID_PARAM = 'client_id';
  const clientId = urlSearchParams.get(CLIENT_ID_PARAM);

  LoginBox((identity) => {
    // Check if target and identity are the same; Then we run owner login;
    if (clientId && identity === stripIdentity(clientId)) {
      window.location.href = `https://${identity}/owner/login?returnUrl=/owner`;
    } else {
      window.location.href = `https://${identity}/api/${target}?${params.startsWith('?') ? params.slice(1) : params}`;
    }
  }, true);
};
