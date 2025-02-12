// import './style.css';

(async () => {
  const pathName = window.location.pathname;
  if (pathName.startsWith('/anonymous')) {
    const { Logon } = await import('./pages/logon');
    Logon();
  } else if (pathName.startsWith('/redirect')) {
    const { Redirect } = await import('./pages/redirect');
    Redirect();
  } else if (pathName.startsWith('/auth')) {
    const { RedirectAuth } = await import('./pages/redirect-auth');
    RedirectAuth();
  } else {
    const { About } = await import('./pages/about');
    About();
  }
})();
