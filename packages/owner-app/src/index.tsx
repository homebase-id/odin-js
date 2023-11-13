import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './app/App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    import.meta.env.MODE === 'production' ? '/owner/service-worker.js' : '/owner/dev-sw.js?dev-sw'
  );
}
