import {
  ApiType,
  Unsubscribe,
  NotificationType,
  Subscribe,
  TargetDrive,
  TypedConnectionNotification,
  Notify,
  DotYouClient,
} from '@homebase-id/js-lib/core';
import { useEffect, useState, useCallback } from 'react';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { hasDebugFlag } from '@homebase-id/js-lib/helpers';
import { NotifyOverPeer, SubscribeOverPeer, UnsubscribeOverPeer } from '@homebase-id/js-lib/peer';

const isDebug = hasDebugFlag();

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
export const useWebsocketSubscriber = (
  handler:
    | ((dotYouClient: DotYouClient, notification: TypedConnectionNotification) => void)
    | undefined,
  odinId: string | undefined,
  types: NotificationType[],
  drives: TargetDrive[],
  onDisconnect?: () => void,
  onReconnect?: () => void,
  refId?: string
) => {
  const dotYouClient = useDotYouClientContext();
  const isPeer = !!odinId && odinId !== dotYouClient.getHostIdentity();
  const [isConnected, setIsConected] = useState<boolean>(false);

  const wrappedHandler = useCallback(
    (dotYouClient: DotYouClient, notification: TypedConnectionNotification) => {
      if (notification.notificationType === 'inboxItemReceived') {
        isDebug &&
          console.debug(
            '[NotificationSubscriber] Replying to inboxItemReceived by sending processInbox'
          );

        if (isPeer)
          NotifyOverPeer({
            command: 'processInbox',
            data: JSON.stringify({
              targetDrive: notification.targetDrive,
              batchSize: 100,
            }),
          });
        else
          Notify({
            command: 'processInbox',
            data: JSON.stringify({
              targetDrive: notification.targetDrive,
              batchSize: 100,
            }),
          });
      }

      if (types?.length >= 1 && !types.includes(notification.notificationType)) return;
      handler && handler(dotYouClient, notification);
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
        if (isPeer)
          await SubscribeOverPeer(
            dotYouClient,
            odinId,
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
        else
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
      if (localHandler) {
        setIsConected(false);
        try {
          if (isPeer) UnsubscribeOverPeer(localHandler);
          else Unsubscribe(localHandler);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [localHandler]);

  return isConnected;
};
