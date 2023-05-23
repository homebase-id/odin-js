import { ClientConnectionNotification, TypedConnectionNotification } from '@youfoundation/js-lib';
import { ReactNode, useEffect, useState } from 'react';

import {
  DomainHighlighter,
  t,
  useNotificationSubscriber,
  usePendingConnections,
} from '@youfoundation/common-app';
import { useQueryClient } from '@tanstack/react-query';

interface Notification {
  title: string;
  body?: string | ReactNode;
  imgSrc?: string;
  live?: boolean;
  href?: string;
  type?: 'pending';
  key: string;
}

export const useNotifications = () => {
  const { data: pending } = usePendingConnections({ pageSize: 5, pageNumber: 1 }).fetch;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (pending?.results.length) {
      const pendingNotifications: Notification[] = pending?.results.map((connection) => {
        return {
          key: `incoming-${connection.senderOdinId}`,
          title: t('Incoming connection request'),
          body: (
            <>
              {`${t('You have a new connection request from')}`}{' '}
              <DomainHighlighter>{connection.senderOdinId}</DomainHighlighter>
            </>
          ),
          imgSrc: `https://api.${connection.senderOdinId}/pub/image`,
          href: `/owner/connections/${connection.senderOdinId}`,
          type: 'pending',
          live: notifications.some(
            (notification) =>
              notification.live && notification.key === `incoming-${connection.senderOdinId}`
          ),
        };
      });

      setNotifications([
        ...notifications.filter((not) => not.type !== 'pending'),
        ...pendingNotifications,
      ]);
    }
  }, [pending?.results]);

  const handler = (wsNotification: TypedConnectionNotification) => {
    const clientNotification = wsNotification as ClientConnectionNotification;

    if (
      wsNotification.notificationType === 'connectionRequestAccepted' ||
      wsNotification.notificationType === 'connectionRequestReceived'
    ) {
      if (wsNotification.notificationType === 'connectionRequestReceived') {
        queryClient.invalidateQueries(['pendingConnections']);
      } else {
        queryClient.invalidateQueries(['sentRequests']);
      }

      console.log(clientNotification);

      const otherId =
        clientNotification.notificationType === 'connectionRequestReceived'
          ? clientNotification.sender
          : clientNotification.recipient;

      const notification: Notification = {
        key: `incoming-${otherId}`,
        title:
          clientNotification.notificationType === 'connectionRequestReceived'
            ? t('New connection request')
            : t('Your connection request was accepted'),
        body: otherId ? <DomainHighlighter>{otherId}</DomainHighlighter> : undefined,
        imgSrc: `https://api.${otherId}/pub/image`,
        live: true,
        href: `/owner/connections/${otherId}`,
        type:
          clientNotification.notificationType === 'connectionRequestReceived'
            ? 'pending'
            : undefined,
      };

      setNotifications((oldSet) => [...oldSet, notification]);
    }
  };

  const dismiss = (notification: Notification) => {
    // Just mark the notification as "handled" and avoid displaying it as an overlay; While keeping it in the list of notifications
    setNotifications(notifications.filter((noti) => noti !== notification));
  };

  useNotificationSubscriber(handler, [
    'connectionRequestAccepted',
    'connectionRequestReceived',
    'unknown',
  ]);

  return { notifications, dismiss };
};
