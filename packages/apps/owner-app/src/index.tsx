import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './app/App';
import { OWNER_ROOT } from '@homebase-id/common-app';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  if (window.location.pathname === OWNER_ROOT) {
    window.location.assign(window.location.href + '/');
  } else {
    navigator.serviceWorker.register(
      import.meta.env.MODE === 'production' ? '/owner/sw.js' : '/owner/dev-sw.js?dev-sw',
      { scope: `${OWNER_ROOT}/` }
    );
  }
}
