import {
  ApiType,
  Unsubscribe,
  NotificationType,
  Subscribe,
  TargetDrive,
  TypedConnectionNotification,
  Notify,
} from '@homebase-id/js-lib/core';
import { useEffect, useState, useCallback } from 'react';
import { useDotYouClient } from '../auth/useDotYouClient';
import { hasDebugFlag } from '@homebase-id/js-lib/helpers';

const isDebug = hasDebugFlag();

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
export const useWebsocketSubscriber = (
  handler: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[],
  drives: TargetDrive[],
  onDisconnect?: () => void,
  onReconnect?: () => void,
  refId?: string
) => {
  const [isConnected, setIsConected] = useState<boolean>(false);
  const dotYouClient = useDotYouClient().getDotYouClient();

  const wrappedHandler = useCallback(
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
      handler && handler(notification);
    },
    [handler]
  );

  const localHandler = handler ? wrappedHandler : undefined;

  useEffect(() => {
    if (
      (dotYouClient.getType() !== ApiType.Owner && dotYouClient.getType() !== ApiType.App) ||
      !dotYouClient.getSharedSecret()
    )
      return;

    if (!isConnected && localHandler) {
      (async () => {
        await Subscribe(
          dotYouClient,
          drives,
          localHandler,
          () => {
            setIsConected(false);
            onDisconnect && onDisconnect();
          },
          () => {
            setIsConected(true);
            onReconnect && onReconnect();
          },
          undefined,
          refId
        );
        setIsConected(true);
      })();
    }

    return () => {
      if (isConnected && localHandler) {
        setIsConected(false);
        try {
          Unsubscribe(localHandler);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [localHandler]);

  return isConnected;
};
