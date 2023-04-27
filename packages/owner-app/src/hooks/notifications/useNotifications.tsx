import { ClientConnectionNotification, TypedConnectionNotification } from '@youfoundation/js-lib';
import { ReactNode, useEffect, useState } from 'react';

import useNotificationSubscriber from '../transitProcessor/useNotificationSubscriber';
import { usePendingConnections } from '../connections/useConnections';
import { t } from '../../helpers/i18n/dictionary';
import DomainHighlighter from '../../components/ui/DomainHighlighter/DomainHighlighter';
import { useQueryClient } from '@tanstack/react-query';

interface Notification {
  title: string;
  body?: string | ReactNode;
  imgSrc?: string;
  live?: boolean;
  href?: string;
  type?: 'pending';
}

const useNotifications = () => {
  const { data: pending } = usePendingConnections({ pageSize: 5, pageNumber: 1 }).fetch;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (pending?.results.length) {
      const pendingNotifications: Notification[] = pending?.results.map((connection) => {
        return {
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

      setNotifications([
        ...notifications.filter((not) => not.type !== 'pending'),
        ...pendingNotifications,
      ]);
    }
  }, [pending?.results]);

  const handler = (wsNotification: TypedConnectionNotification) => {
    const clientNotification = wsNotification as ClientConnectionNotification;

    if (wsNotification.notificationType === 'connectionRequestReceived') {
      queryClient.invalidateQueries(['pendingConnections']);
    }

    const notification: Notification = {
      title:
        clientNotification.notificationType === 'connectionRequestReceived'
          ? t('New connection request')
          : t('Your connection request was accepted'),
      body: (
        <>
          <DomainHighlighter>{clientNotification.sender}</DomainHighlighter>
        </>
      ),
      imgSrc: `https://${clientNotification.sender}/pub/image`,
      live: true,
      href: `/owner/connections/${clientNotification.sender}`,
      type:
        clientNotification.notificationType === 'connectionRequestReceived' ? 'pending' : undefined,
    };

    setNotifications((oldSet) => [...oldSet, notification]);
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

export default useNotifications;
