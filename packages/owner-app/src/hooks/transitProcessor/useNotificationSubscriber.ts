import {
  ApiType,
  BlogConfig,
  Disconnect,
  DotYouClient,
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
  const { getSharedSecret } = useAuth();
  const isConnected = useRef<boolean>(false);
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

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
        Disconnect(localHandler);
      }
    };
  }, []);

  return;
};

export default useNotificationSubscriber;
