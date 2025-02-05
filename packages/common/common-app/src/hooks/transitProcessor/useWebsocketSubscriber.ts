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
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  const isPeer = useMemo(() => !!odinId && odinId !== dotYouClient.getHostIdentity(), [odinId]);
  const [isConnected, setIsConected] = useState(false);
  const connectedHandler =
    useRef<(dotYouClient: DotYouClient, data: TypedConnectionNotification) => void | null>();

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

  const subscribe = useCallback(
    async (handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void) => {
      connectedHandler.current = handler;

      if (isPeer)
        await SubscribeOverPeer(
          dotYouClient,
          odinId as string,
          drives,
          handler,
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
          handler,
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
    },
    [isPeer, drives]
  );

  const unsubscribe = useCallback(
    (handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void) => {
      try {
        if (isPeer) UnsubscribeOverPeer(handler);
        else Unsubscribe(handler);
      } catch (e) {
        console.error(e);
      }
    },
    [isPeer]
  );

  useEffect(() => {
    if (
      (dotYouClient.getType() !== ApiType.Owner && dotYouClient.getType() !== ApiType.App) ||
      !dotYouClient.getSharedSecret() ||
      !localHandler
    )
      return;

    if (connectedHandler.current) {
      setIsConected(false);
      unsubscribe(connectedHandler.current);
    }

    subscribe(localHandler).then(() => setIsConected(true));

    return () => {
      setIsConected(false);
      unsubscribe(localHandler);
    };
  }, [localHandler]);

  return isConnected;
};
