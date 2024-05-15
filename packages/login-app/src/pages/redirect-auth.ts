import { LoginBox } from '../components/loginBox';

export const RedirectAuth = () => {
  // 1. Parse target URL
  const pathName = window.location.pathname;
  const target = pathName.split('/auth/')[1];
  if (!target) return;

  LoginBox(
    (identity) =>
      (window.location.href = `https://${identity}/api/${target}?${window.location.search}`),
    true
  );
};
