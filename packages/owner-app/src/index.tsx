import React from 'react';
import ReactDOM from 'react-dom/client';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';

import App from './app/App';

const APPLICATIO_PUBLIC_KEY_BASE64 =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

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

  // Register the push Application Server
  // Use serviceWorker.ready to ensure that you can subscribe for push
  navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
    const options = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(APPLICATIO_PUBLIC_KEY_BASE64),
    };
    serviceWorkerRegistration.pushManager.subscribe(options).then(
      (pushSubscription) => {
        console.log('TODO: Send to the server', pushSubscription.endpoint);
        // The push subscription details needed by the application
        // server are now available, and can be sent to it using,
        // for example, an XMLHttpRequest.
      },
      (error) => {
        // During development it often helps to log errors to the
        // console. In a production environment it might make sense to
        // also report information about errors back to the
        // application server.
        console.error(error);
      }
    );
  });
}
