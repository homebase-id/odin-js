import './style.css';

(async () => {
  const pathName = window.location.pathname;
  if (pathName.includes('anonymous')) {
    const { Logon } = await import('./pages/logon');
    Logon();
  } else if (pathName.includes('redirect')) {
    const { Redirect } = await import('./pages/redirect');
    Redirect();
  } else {
    const { About } = await import('./pages/about');
    About();
  }
})();
