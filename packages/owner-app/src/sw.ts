/// <reference lib="webworker" />

self.addEventListener('install', (event) => {
  console.log('SW installed');
});

self.addEventListener('push', function (event) {
  const promiseChain = self.registration.showNotification(
    event.data.text() || 'You have a new notification',
    {
      icon: `/owner/odin-logo.svg`,
    }
  );

  event.waitUntil(promiseChain);
});

// self.addEventListener('notificationclick', function (event) {
//   const examplePageURL = '/owner/notifications';
//   const urlToOpen = new URL(examplePageURL, self.location.origin).href;

//   const promiseChain = clients
//     .matchAll({
//       type: 'window',
//       includeUncontrolled: true,
//     })
//     .then((windowClients) => {
//       let matchingClient = null;

//       for (let i = 0; i < windowClients.length; i++) {
//         const windowClient = windowClients[i];
//         if (windowClient.url === urlToOpen) {
//           matchingClient = windowClient;
//           break;
//         }
//       }

//       if (matchingClient) {
//         return matchingClient.focus();
//       } else {
//         return clients.openWindow(urlToOpen);
//       }
//     });

//   event.waitUntil(promiseChain);
// });

self.addEventListener('notificationclick', function (event) {
  return clients.openWindow('homebase-feed://hello-world');

  event.waitUntil(promiseChain);
});
