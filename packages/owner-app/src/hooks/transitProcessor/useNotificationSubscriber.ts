import {
  BlogConfig,
  Disconnect,
  NotificationType,
  Subscribe,
  TypedConnectionNotification,
} from '@youfoundation/js-lib';
import { useRef, useEffect } from 'react';
import useAuth from '../auth/useAuth';

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
const useNotificationSubscriber = (
  subscriber: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[]
) => {
  const isConnected = useRef<boolean>(false);
  const dotYouClient = useAuth().getDotYouClient();

  const localHandler = (notification: TypedConnectionNotification) => {
    if (types?.length >= 1 && !types.includes(notification.notificationType)) return;
    subscriber && subscriber(notification);
  };

  useEffect(() => {
    if (!isConnected.current) {
      isConnected.current = true;
      Subscribe(dotYouClient, [BlogConfig.FeedDrive, BlogConfig.PublicChannelDrive], localHandler);
    }

    return () => {
      if (isConnected.current) {
        isConnected.current = false;
        try {
          Disconnect(localHandler);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  return;
};

export default useNotificationSubscriber;
