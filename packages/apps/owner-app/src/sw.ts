/// <reference lib="webworker" />
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
declare const self: ServiceWorkerGlobalScope;

// service worker typescript: https://joshuatz.com/posts/2021/strongly-typed-service-workers/
// export default null;

self.addEventListener('install', () => {
  console.log('SW installed');
});

interface NotificationDataOptions {
  appId: string;
  typeId: string;
  tagId: string;
  silent: boolean;
  unEncryptedMessage?: string;
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
const FEED_APP_ID = '5f887d80-0132-4294-ba40-bda79155551d';
const MAIL_APP_ID = '6e8ecfff-7c15-40e4-94f4-d6e83bfb5857';
const COMMUNITY_APP_ID = '77ed6136-6b33-4654-8088-3d89c91e6065';

const OWNER_FOLLOWER_TYPE_ID = '2cc468af-109b-4216-8119-542401e32f4d';
const OWNER_CONNECTION_REQUEST_TYPE_ID = '8ee62e9e-c224-47ad-b663-21851207f768';
const OWNER_CONNECTION_ACCEPTED_TYPE_ID = '79f0932a-056e-490b-8208-3a820ad7c321';
const OWNER_INTRODUCTION_RECEIVED_TYPE_ID = 'f100bfa0-ac4e-468a-9322-bdaf6059ec8a';
const OWNER_INTRODUCTION_ACCEPTED_TYPE_ID = 'f56ee792-56dd-45fd-8f9e-f96bb5d0e3de';

const OWNER_SHAMIR_PASSWORD_RECOVERY_RECRUITED = 'c5e3a188-487f-4162-8b37-ee6c6f4a27ef';
const OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_REQUESTED = '260e370d-85d5-4ed9-92ed-bb2b36b0f73c';
const OWNER_SHAMIR_PASSWORD_RECOVERY_SUFFICIENT_SHARDS_COLLECTED = '0df41b47-939e-47c0-8439-d38ce8b4d048';
const OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_COLLECTED = 'e1cb2e75-2002-4ce0-a2e3-f228579229ef';

const FEED_NEW_CONTENT_TYPE_ID = 'ad695388-c2df-47a0-ad5b-fc9f9e1fffc9';
const FEED_NEW_REACTION_TYPE_ID = '37dae95d-e137-4bd4-b782-8512aaa2c96a';
const FEED_NEW_COMMENT_TYPE_ID = '1e08b70a-3826-4840-8372-18410bfc02c7';

const buildNotificationTitle = (payload: NotificationData) =>
  `${payload.appDisplayName || 'Homebase'}`;

const getNameForOdinId = async (odinId: string) => {
  return await fetch(`https://${odinId}/pub/profile`)
    .then((response) => response.json())
    .then((profile: { name: string } | undefined) => {
      if (profile) return profile.name;
    })
    .catch(() => undefined);
};

const buildNotificationBody = async (
  payload: NotificationData,
  existingNotifications: Notification[]
) => {
  const sender = (await getNameForOdinId(payload.senderId)) || payload.senderId;

  if (payload.options.unEncryptedMessage)
    return (payload.options.unEncryptedMessage || '').replace(payload.senderId, sender);

  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (payload.options.typeId === OWNER_FOLLOWER_TYPE_ID) {
      return `${sender} started following you`;
    } else if (payload.options.typeId === OWNER_CONNECTION_REQUEST_TYPE_ID) {
      return `${sender} sent you a connection request`;
    } else if (payload.options.typeId === OWNER_CONNECTION_ACCEPTED_TYPE_ID) {
      return `${sender} accepted your connection request`;
    } else if (payload.options.typeId === OWNER_INTRODUCTION_RECEIVED_TYPE_ID) {
      return `${sender} introduced you to someone`;
    } else if (payload.options.typeId === OWNER_INTRODUCTION_ACCEPTED_TYPE_ID) {
      return `${sender} confirmed the introduction`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_RECRUITED) {
      return `${sender} added you as part of their password recovery process.  This has zero impact to you :)`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_REQUESTED) {
      return `${sender} as has requested you verify their request to help recover their password.`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SUFFICIENT_SHARDS_COLLECTED) {
      return 'We now have sufficient shards to recover your password.  Check your email for the final steps.';
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_COLLECTED) {
      return `Good news!  We've collected a shard of your password recovery from ${sender}.  ${payload.options.unEncryptedMessage}`
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    const hasMultiple = existingNotifications.length;
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'} via ${
      payload.appDisplayName
    }`;
  } else if (payload.options.appId === MAIL_APP_ID) {
    const hasMultiple = existingNotifications.length;
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'} via ${
      payload.appDisplayName
    }`;
  } else if (payload.options.appId === FEED_APP_ID) {
    if (payload.options.typeId === FEED_NEW_CONTENT_TYPE_ID) {
      return `${sender} uploaded a new post`;
    } else if (payload.options.typeId === FEED_NEW_REACTION_TYPE_ID) {
      return `${sender} reacted to your post`;
    } else if (payload.options.typeId === FEED_NEW_COMMENT_TYPE_ID) {
      return `${sender} commented to your post`;
    }
  } else if (payload.options.appId === COMMUNITY_APP_ID) {
    const hasMultiple = existingNotifications.length;
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  }

  return `${sender} sent you a notification via ${payload.appDisplayName}`;
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
        const existingNotifications = await self.registration.getNotifications({tag});

        const title = buildNotificationTitle(payload);
        const body = await buildNotificationBody(payload, existingNotifications);

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

self.addEventListener('notificationclick', (event) => {
  console.log(event.notification);
  event.notification.close();

  const {pathToOpen, postMessageData}: { pathToOpen: string; postMessageData?: unknown } =
    (() => {
      if (
        event.notification?.data?.options?.appId === CHAT_APP_ID &&
        event.notification?.data?.options?.typeId
      ) {
        return {
          pathToOpen: `/apps/chat/${event.notification?.data?.options?.typeId}`,
        };
      }

      if (
        event.notification?.data?.options?.appId === MAIL_APP_ID &&
        event.notification?.data?.options?.typeId
      ) {
        return {
          pathToOpen: `/apps/mail/inbox/${event.notification?.data?.options?.typeId}`,
        };
      }

      if (event.notification?.data?.options?.appId === FEED_APP_ID) {
        return {pathToOpen: `/apps/feed`};
      }

      if (event.notification?.data?.options?.appId === COMMUNITY_APP_ID) {
        return {
          pathToOpen: `/apps/community/redirect/${event.notification?.data?.options?.typeId}/${event.notification?.data?.options?.tagId}`,
        };
      }

      const tagId = event.notification?.data?.options?.tagId;
      return {
        pathToOpen: `/owner/notifications${tagId ? `?notification=${tagId}` : ''}`,
        postMessageData: {notification: tagId},
      };
    })();

  const urlToOpen = new URL(pathToOpen, self.location.origin).href;
  // const matchingUrl = matchingPath ? new URL(matchingPath, self.location.origin).href : '';

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
        if (postMessageData) {
          matchingClient.postMessage(postMessageData);
        }

        return matchingClient.focus();
      } else {
        return self.clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});
