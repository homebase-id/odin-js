import {
  ApiType,
  AppNotification,
  ClientConnectionNotification,
  DotYouClient,
  PushNotification,
  TypedConnectionNotification,
} from '@homebase-id/js-lib/core';
import { ReactNode, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { t } from '../../helpers/i18n/dictionary';
import { DomainHighlighter } from '../../ui/DomainHighlighter/DomainHighlighter';
import { useNotificationSubscriber } from '../transitProcessor/useNotificationSubscriber';
import { incrementAppIdNotificationCount } from './usePushNotifications';

interface Notification {
  title: string;
  body?: string | ReactNode;
  imgSrc?: string;
  href?: string;
  type?: 'pending';
  key: string;
}

export const useNotifications = () => {
  // const { data: pending } = usePendingConnections({ pageSize: 5, pageNumber: 1 }).fetch;
  const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);
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

      const notification: Notification = {
        key: `incoming-${otherId}`,
        title:
          clientNotification.notificationType === 'connectionRequestReceived'
            ? t('New connection request')
            : t('Your connection request was accepted'),
        body: otherId ? <DomainHighlighter>{otherId}</DomainHighlighter> : undefined,
        imgSrc: `${host}/pub/image`,
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
        queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
        queryClient.invalidateQueries({ queryKey: ['pending-connection'] });
      } else {
        // Accepted
        queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
        queryClient.invalidateQueries({ queryKey: ['active-connections'] });
      }
    }

    if (wsNotification.notificationType === 'appNotificationAdded') {
      const clientNotification = wsNotification as AppNotification;

      const existingNotificationData = queryClient.getQueryData<{
        results: PushNotification[];
        cursor: number;
      }>(['push-notifications']);

      if (existingNotificationData) {
        const newNotificationData = {
          ...existingNotificationData,
          results: [
            clientNotification,
            ...existingNotificationData.results.filter(
              (notification) =>
                !stringGuidsEqual(notification.options.tagId, clientNotification.options.tagId)
            ),
          ],
        };
        queryClient.setQueryData(['push-notifications'], newNotificationData);
      }
      incrementAppIdNotificationCount(queryClient, clientNotification.options.appId);
    }
  }, []);

  const dismiss = (notification: Notification) => {
    // Just mark the notification as "handled" and avoid displaying it as an overlay; While keeping it in the list of notifications
    setLiveNotifications(liveNotifications.filter((noti) => noti !== notification));
  };

  useNotificationSubscriber(
    handler,
    ['connectionRequestAccepted', 'connectionRequestReceived', 'appNotificationAdded', 'unknown'],
    [BlogConfig.FeedDrive]
  );
  return {
    liveNotifications,
    dismiss,
  };
};
