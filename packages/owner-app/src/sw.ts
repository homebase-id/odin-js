/// <reference lib="webworker" />
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
declare const self: ServiceWorkerGlobalScope;

// service worker typescript: https://joshuatz.com/posts/2021/strongly-typed-service-workers/
// export default null;

self.addEventListener('install', (event) => {
  console.log('SW installed');
});

interface NotificationDataOptions {
  appId: string;
  typeId: string;
  tagId: string;
  silent: boolean;
}

interface NotificationData {
  appDisplayName: string;
  options: NotificationDataOptions;
  senderId: string;
  timestamp: number;
}

interface PushData {
  payloads: NotificationData[];
}

const OWNER_APP_ID = 'ac126e09-54cb-4878-a690-856be692da16';
const CHAT_APP_ID = '2d781401-3804-4b57-b4aa-d8e4e2ef39f4';

const OWNER_FOLLOWER_TYPE_ID = '2cc468af-109b-4216-8119-542401e32f4d';
const OWNER_CONNECTION_REQUEST_TYPE_ID = '8ee62e9e-c224-47ad-b663-21851207f768';
const OWNER_CONNECTION_ACCEPTED_TYPE_ID = '79f0932a-056e-490b-8208-3a820ad7c321';

const bodyFormer = (payload: NotificationData, existingNotifications: Notification[]) => {
  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (payload.options.typeId === OWNER_FOLLOWER_TYPE_ID) {
      return `${payload.senderId} started following you`;
    } else if (payload.options.typeId === OWNER_CONNECTION_REQUEST_TYPE_ID) {
      return `${payload.senderId} sent you a connection request`;
    } else if (payload.options.typeId === OWNER_CONNECTION_ACCEPTED_TYPE_ID) {
      return `${payload.senderId} accepted your connection request`;
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    const hasMultiple = existingNotifications.length;
    return `${payload.senderId} sent you ${hasMultiple ? 'multiple messages' : 'a message'} via ${
      payload.appDisplayName
    }`;
  }

  return `${payload.senderId} sent you a notification via ${payload.appDisplayName}`;
};

const getTag = (payload: NotificationData) => {
  if (payload.options.appId === CHAT_APP_ID) {
    // Chat groupId is the tagId; Will avoid multiple notifications for same conversation
    return payload.options.typeId;
  }

  // Else, tagId as it's unique
  return payload.options.tagId;
};

self.addEventListener('push', function (event) {
  try {
    const notificationBath: PushData = event.data?.json();

    const promiseChain = Promise.all(
      notificationBath.payloads.map(async (payload) => {
        if (!payload || !payload.options) return;

        const tag = getTag(payload);
        const existingNotifications = await self.registration.getNotifications({ tag });

        const title = `${payload.senderId} | ${payload.appDisplayName}`;
        const body = bodyFormer(payload, existingNotifications);

        if (!title || !body || !tag) return;

        if (existingNotifications)
          await Promise.all(existingNotifications.map((notification) => notification.close()));

        return self.registration.showNotification(title, {
          icon: `/owner/odin-logo.svg`,
          body,
          tag,
          timestamp: payload.timestamp,
          silent: payload.options.silent,
          data: payload,
        });
      })
    );

    event.waitUntil(promiseChain);
  } catch (e) {
    console.error('Push error', e);
    const promiseChain = self.registration.showNotification('You have a new notification', {
      icon: `/owner/odin-logo.svg`,
    });

    event.waitUntil(promiseChain);
  }
});

self.addEventListener('message', (event) => {
  console.log('sw: message', event);
});

self.addEventListener('notificationclick', (event) => {
  // console.log(event.notification);

  event.notification.close();

  const tagId = event.notification?.data?.options?.tagId;
  const examplePageURL = `/owner/notifications${tagId ? `?notification=${tagId}` : ''}`;
  const urlToOpen = new URL(examplePageURL, self.location.origin).href;

  const promiseChain = self.clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      let matchingClient: WindowClient | null = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url === urlToOpen.split('?')[0]) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        matchingClient.postMessage({ notification: tagId });
        return matchingClient.focus();
      } else {
        return self.clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});
