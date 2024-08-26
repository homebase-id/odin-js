import {
  ApiType,
  Unsubscribe,
  NotificationType,
  Subscribe,
  TargetDrive,
  TypedConnectionNotification,
  Notify,
} from '@homebase-id/js-lib/core';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useDotYouClient } from '../auth/useDotYouClient';
import { hasDebugFlag } from '@homebase-id/js-lib/helpers';

const isDebug = hasDebugFlag();

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
export const useNotificationSubscriber = (
  subscriber: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[],
  drives: TargetDrive[],
  onDisconnect?: () => void,
  onReconnect?: () => void
) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const isConnected = useRef<boolean>(false);
  const dotYouClient = useDotYouClient().getDotYouClient();

  const wrappedSubscriber = useCallback(
    (notification: TypedConnectionNotification) => {
      if (notification.notificationType === 'inboxItemReceived') {
        isDebug &&
          console.debug(
            '[NotificationSubscriber] Replying to inboxItemReceived by sending processInbox'
          );

        Notify({
          command: 'processInbox',
          data: JSON.stringify({
            targetDrive: notification.targetDrive,
            batchSize: 100,
          }),
        });
      }

      if (types?.length >= 1 && !types.includes(notification.notificationType)) return;
      subscriber && subscriber(notification);
    },
    [subscriber]
  );

  const localHandler = subscriber ? wrappedSubscriber : undefined;

  useEffect(() => {
    if (
      (dotYouClient.getType() !== ApiType.Owner && dotYouClient.getType() !== ApiType.App) ||
      !dotYouClient.getSharedSecret()
    )
      return;

    if (!isConnected.current && localHandler) {
      isConnected.current = true;
      (async () => {
        await Subscribe(
          dotYouClient,
          drives,
          localHandler,
          () => {
            setIsActive(false);
            onDisconnect && onDisconnect();
          },
          () => {
            setIsActive(true);
            onReconnect && onReconnect();
          }
        );
        setIsActive(true);
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
  }, [localHandler]);

  return isActive;
};
