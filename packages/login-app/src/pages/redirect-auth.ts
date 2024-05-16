import { LoginBox } from '../components/loginBox';

export const RedirectAuth = () => {
  // 1. Parse target URL
  const pathName = window.location.pathname;
  const target = pathName.split('/auth/')[1];
  if (!target) return;

  const params = window.location.search;

  LoginBox(
    (identity) =>
      (window.location.href = `https://${identity}/api/${target}?${params.startsWith('?') ? params.slice(1) : params}`),
    true
  );
};
