import {
  ApiType,
  Disconnect,
  NotificationType,
  Subscribe,
  TargetDrive,
  TypedConnectionNotification,
} from '@youfoundation/js-lib/core';
import { useRef, useEffect } from 'react';
import { useDotYouClient } from '../auth/useDotYouClient';
import { BlogConfig } from '@youfoundation/js-lib/public';

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
export const useNotificationSubscriber = (
  subscriber: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[],
  drives: TargetDrive[] = [BlogConfig.FeedDrive, BlogConfig.PublicChannelDrive]
) => {
  const isConnected = useRef<boolean>(false);
  const dotYouClient = useDotYouClient().getDotYouClient();

  const localHandler = subscriber
    ? (notification: TypedConnectionNotification) => {
        if (types?.length >= 1 && !types.includes(notification.notificationType)) return;
        subscriber && subscriber(notification);
      }
    : undefined;

  useEffect(() => {
    if (
      (dotYouClient.getType() !== ApiType.Owner && dotYouClient.getType() !== ApiType.App) ||
      !dotYouClient.getSharedSecret()
    )
      return;

    if (!isConnected.current && localHandler) {
      isConnected.current = true;
      Subscribe(dotYouClient, drives, localHandler);
    }

    return () => {
      if (isConnected.current && localHandler) {
        isConnected.current = false;
        try {
          Disconnect(localHandler);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [subscriber]);

  return;
};
