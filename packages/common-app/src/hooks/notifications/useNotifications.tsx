import {
  ClientConnectionNotification,
  TypedConnectionNotification,
} from '@youfoundation/js-lib/core';
import { ReactNode, useState } from 'react';

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
  href?: string;
  type?: 'pending';
  key: string;
}

export const useNotifications = () => {
  const { data: pending } = usePendingConnections({ pageSize: 5, pageNumber: 1 }).fetch;
  const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  const handler = (wsNotification: TypedConnectionNotification) => {
    const clientNotification = wsNotification as ClientConnectionNotification;

    if (
      wsNotification.notificationType === 'connectionRequestAccepted' ||
      wsNotification.notificationType === 'connectionRequestReceived'
    ) {
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
        imgSrc: `https://${otherId}/pub/image`,
        href: `/owner/connections/${otherId}`,
        type:
          clientNotification.notificationType === 'connectionRequestReceived'
            ? 'pending'
            : undefined,
      };

      setLiveNotifications((oldSet) => [
        ...oldSet.filter((existing) => existing.key !== notification.key),
        notification,
      ]);

      if (wsNotification.notificationType === 'connectionRequestReceived') {
        queryClient.invalidateQueries(['pendingConnections']);
        queryClient.invalidateQueries(['pendingConnection']);
      } else {
        queryClient.invalidateQueries(['sentRequests']);
      }
    }
  };

  const dismiss = (notification: Notification) => {
    // Just mark the notification as "handled" and avoid displaying it as an overlay; While keeping it in the list of notifications
    setLiveNotifications(liveNotifications.filter((noti) => noti !== notification));
  };

  useNotificationSubscriber(handler, [
    'connectionRequestAccepted',
    'connectionRequestReceived',
    'unknown',
  ]);

  const notifications = pending?.results.map((connection) => {
    return {
      key: `incoming-${connection.senderOdinId}`,
      title: t('Incoming connection request'),
      body: (
        <>
          {`${t('You have a new connection request from')}`}{' '}
          <DomainHighlighter>{connection.senderOdinId}</DomainHighlighter>
        </>
      ),
      imgSrc: `https://${connection.senderOdinId}/pub/image`,
      href: `/owner/connections/${connection.senderOdinId}`,
      type: 'pending',
    };
  });

  return {
    notifications,
    liveNotifications,
    hasUnread: notifications?.length ? notifications.length > 0 : false,
    dismiss,
  };
};
