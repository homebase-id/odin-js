import {
  ApiType,
  Unsubscribe,
  NotificationType,
  Subscribe,
  TargetDrive,
  TypedConnectionNotification,
} from '@youfoundation/js-lib/core';
import { useRef, useEffect, useState } from 'react';
import { useDotYouClient } from '../auth/useDotYouClient';
import { BlogConfig } from '@youfoundation/js-lib/public';

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
export const useNotificationSubscriber = (
  subscriber: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[],
  drives: TargetDrive[] = [BlogConfig.FeedDrive, BlogConfig.PublicChannelDrive]
) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const isConnected = useRef<boolean>(false);
  const dotYouClient = useDotYouClient().getDotYouClient();

  const [shouldReconnect, setShouldReconnect] = useState<boolean>(false);

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
      (async () => {
        await Subscribe(dotYouClient, drives, localHandler, () => {
          isConnected.current = false;
          setIsActive(false);

          setShouldReconnect(true);
        });
        setIsActive(true);
        setShouldReconnect(false);
      })();
    }

    return () => {
      if (isConnected.current && localHandler) {
        isConnected.current = false;
        try {
          Unsubscribe(localHandler);
          setIsActive(false);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [subscriber, shouldReconnect]);

  return isActive;
};
