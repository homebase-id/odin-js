import './style.css';

(async () => {
    const isLogon = window.location.pathname.includes('anonymous');
    if (isLogon) {
        const { setupLogon } = await import('./logon');
        setupLogon();
    } else {
        const { setupAbout } = await import('./about');
        setupAbout();
    }
})();
