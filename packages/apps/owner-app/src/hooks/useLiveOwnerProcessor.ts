import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { OdinClient, TypedConnectionNotification } from '@homebase-id/js-lib/core';
import {
  invalidateActiveConnections,
  invalidatePendingConnections,
  useWebsocketSubscriber,
} from '@homebase-id/common-app';
import { websocketDrives } from './auth/useAuth';

export const useLiveOwnerProcessor = () => {
  const isOnline = useOwnerWebSocket(true);

  return isOnline;
};

const useOwnerWebSocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();

  const handler = useCallback((_: OdinClient, notification: TypedConnectionNotification) => {
    if (notification.notificationType === 'connectionFinalized') {
      setTimeout(() => {
        invalidatePendingConnections(queryClient);
        invalidateActiveConnections(queryClient);
      }, 1000);
    }
  }, []);

  useWebsocketSubscriber(
    isEnabled ? handler : undefined,
    undefined,
    ['connectionFinalized'],
    websocketDrives,
    undefined,
    undefined,
    'useLiveOwnerProcessor'
  );
};
