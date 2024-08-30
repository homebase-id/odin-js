import {
  ApiType,
  AppNotification,
  ClientConnectionNotification,
  DotYouClient,
  PushNotification,
  TargetDrive,
  TypedConnectionNotification,
} from '@homebase-id/js-lib/core';
import { ReactNode, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '../../helpers/i18n/dictionary';
import { DomainHighlighter } from '../../ui/DomainHighlighter/DomainHighlighter';
import { useWebsocketSubscriber } from '../transitProcessor/useWebsocketSubscriber';
import { incrementAppIdNotificationCount, insertPushNotification } from './usePushNotifications';
import {
  OWNER_APP_ID,
  CHAT_APP_ID,
  MAIL_APP_ID,
  FEED_APP_ID,
  COMMUNITY_APP_ID,
} from '../../constants';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

interface LiveNotification {
  title: string;
  body?: string | ReactNode;
  imgSrc?: string;
  href?: string;
  key: string;
}

export const useLiveNotifications = (props: { drives?: TargetDrive[] } | undefined = {}) => {
  const { drives } = props || {};
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);
  const queryClient = useQueryClient();

  const handler = useCallback((wsNotification: TypedConnectionNotification) => {
    const clientNotification = wsNotification as ClientConnectionNotification;

    if (
      wsNotification.notificationType === 'connectionRequestAccepted' ||
      wsNotification.notificationType === 'connectionRequestReceived'
    ) {
      console.debug(clientNotification);

      const otherId =
        clientNotification.notificationType === 'connectionRequestReceived'
          ? clientNotification.sender
          : clientNotification.recipient;

      const host = new DotYouClient({ api: ApiType.Guest, identity: otherId }).getRoot();

      const liveNotification: LiveNotification = {
        key: `incoming-${otherId}`,
        title:
          clientNotification.notificationType === 'connectionRequestReceived'
            ? t('New connection request')
            : t('Your connection request was accepted'),
        body: otherId ? <DomainHighlighter>{otherId}</DomainHighlighter> : undefined,
        imgSrc: `${host}/pub/image`,
        href: `/owner/connections/${otherId}`,
      };

      setLiveNotifications((oldSet) => [
        ...oldSet.filter((existing) => existing.key !== liveNotification.key),
        liveNotification,
      ]);

      if (wsNotification.notificationType === 'connectionRequestReceived') {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
        queryClient.invalidateQueries({ queryKey: ['pending-connection'] });
      } else {
        // Accepted
        queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
        queryClient.invalidateQueries({ queryKey: ['active-connections'] });
      }
    } else if (wsNotification.notificationType === 'appNotificationAdded') {
      const clientNotification = wsNotification as AppNotification;

      insertPushNotification(queryClient, clientNotification);
      incrementAppIdNotificationCount(queryClient, clientNotification.options.appId);

      // Add as live notification
      const host = new DotYouClient({
        api: ApiType.Guest,
        identity: clientNotification.senderId,
      }).getRoot();

      const targetLink = buildNotificationTargetLink(clientNotification);
      if (
        window.location.pathname === targetLink ||
        (targetLink && window.location.pathname.startsWith(targetLink))
      )
        return;

      const liveNotification: LiveNotification = {
        key: clientNotification.id,
        title: buildNotificationTitle(clientNotification),
        body: buildNotificationBody(
          clientNotification,
          false,
          clientNotification.options.appId,
          undefined
        ),
        imgSrc: `${host}/pub/image`,
        href: targetLink,
      };

      setLiveNotifications((oldSet) => [
        ...oldSet.filter((existing) => existing.key !== liveNotification.key),
        liveNotification,
      ]);
    }
  }, []);

  const dismiss = (notification: LiveNotification) => {
    // Just mark the notification as "handled" and avoid displaying it as an overlay; While keeping it in the list of notifications
    setLiveNotifications(liveNotifications.filter((noti) => noti !== notification));
  };

  useWebsocketSubscriber(
    handler,
    ['connectionRequestAccepted', 'connectionRequestReceived', 'appNotificationAdded', 'unknown'],
    drives || [],
    undefined,
    undefined,
    'useLiveNotifications'
  );
  return {
    liveNotifications,
    dismiss,
  };
};

const OWNER_FOLLOWER_TYPE_ID = '2cc468af-109b-4216-8119-542401e32f4d';
const OWNER_CONNECTION_REQUEST_TYPE_ID = '8ee62e9e-c224-47ad-b663-21851207f768';
const OWNER_CONNECTION_ACCEPTED_TYPE_ID = '79f0932a-056e-490b-8208-3a820ad7c321';

const FEED_NEW_CONTENT_TYPE_ID = 'ad695388-c2df-47a0-ad5b-fc9f9e1fffc9';
const FEED_NEW_REACTION_TYPE_ID = '37dae95d-e137-4bd4-b782-8512aaa2c96a';
const FEED_NEW_COMMENT_TYPE_ID = '1e08b70a-3826-4840-8372-18410bfc02c7';

export const buildNotificationTitle = (payload: PushNotification) => {
  if (stringGuidsEqual(payload.options.appId, OWNER_APP_ID)) {
    return 'Homebase';
  } else if (stringGuidsEqual(payload.options.appId, CHAT_APP_ID)) {
    return 'Homebase Chat';
  } else if (stringGuidsEqual(payload.options.appId, MAIL_APP_ID)) {
    return 'Hombease Mail';
  } else if (stringGuidsEqual(payload.options.appId, FEED_APP_ID)) {
    return 'Homebase Feed';
  } else if (stringGuidsEqual(payload.options.appId, COMMUNITY_APP_ID)) {
    return 'Homebase Community';
  }

  return `Unknown (${payload.options.appId})`;
};

export const buildNotificationBody = (
  payload: PushNotification,
  hasMultiple: boolean,
  appName: string,
  senderName: string | undefined
) => {
  const sender = senderName || payload.senderId;

  if (payload.options.unEncryptedMessage)
    return (payload.options.unEncryptedMessage || '').replaceAll(payload.senderId, sender);

  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (payload.options.typeId === OWNER_FOLLOWER_TYPE_ID) {
      return `${sender} started following you`;
    } else if (payload.options.typeId === OWNER_CONNECTION_REQUEST_TYPE_ID) {
      return `${sender} sent you a connection request`;
    } else if (payload.options.typeId === OWNER_CONNECTION_ACCEPTED_TYPE_ID) {
      return `${sender} accepted your connection request`;
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  } else if (payload.options.appId === MAIL_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  } else if (payload.options.appId === FEED_APP_ID) {
    if (payload.options.typeId === FEED_NEW_CONTENT_TYPE_ID) {
      return `${sender} uploaded a new post`;
    } else if (payload.options.typeId === FEED_NEW_REACTION_TYPE_ID) {
      return `${sender} reacted to your post`;
    } else if (payload.options.typeId === FEED_NEW_COMMENT_TYPE_ID) {
      return `${sender} commented to your post`;
    }
  } else if (payload.options.appId === COMMUNITY_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  }

  return `${sender} sent you a notification via ${appName}`;
};

export const buildNotificationTargetLink = (payload: PushNotification) => {
  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (
      [
        OWNER_FOLLOWER_TYPE_ID,
        OWNER_CONNECTION_REQUEST_TYPE_ID,
        OWNER_CONNECTION_ACCEPTED_TYPE_ID,
      ].includes(payload.options.typeId)
    ) {
      return `/owner/connections/${payload.senderId}`;
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `/apps/chat/${payload.options.typeId}`;
  } else if (payload.options.appId === MAIL_APP_ID) {
    return `/apps/mail/inbox/${payload.options.typeId}`;
  } else if (payload.options.appId === FEED_APP_ID) {
    return `/apps/feed`;
  } else if (payload.options.appId === COMMUNITY_APP_ID) {
    return `/apps/community/${payload.options.typeId}`;
  }
};
