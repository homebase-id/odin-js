import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TypedConnectionNotification } from '@homebase-id/js-lib/core';
import { useWebsocketSubscriber } from '@homebase-id/common-app';
import { websocketDrives } from './auth/useAuth';

export const useLiveOwnerProcessor = () => {
  const isOnline = useFeedWebSocket(true);

  return isOnline;
};

const useFeedWebSocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();

  const handler = useCallback((notification: TypedConnectionNotification) => {
    if (notification.notificationType === 'connectionFinalized') {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['active-connections'], exact: false });
      }, 1000);
    }
  }, []);

  useWebsocketSubscriber(
    isEnabled ? handler : undefined,
    ['connectionFinalized'],
    websocketDrives,
    undefined,
    undefined,
    'useLiveOwnerProcessor'
  );
};
