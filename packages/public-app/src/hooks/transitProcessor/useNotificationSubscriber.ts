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

const useNotificationSubscriber = (
  subscriber: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[]
) => {
  const dotYouClient = useAuth().getDotYouClient();
  const isConnected = useRef<boolean>(false);

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
