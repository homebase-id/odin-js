import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DotYouClient, TypedConnectionNotification } from '@homebase-id/js-lib/core';
import { useWebsocketSubscriber } from '@homebase-id/common-app';
import { websocketDrives } from './auth/useAuth';

export const useLiveOwnerProcessor = () => {
  const isOnline = useOwnerWebSocket(true);

  return isOnline;
};

const useOwnerWebSocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();

  const handler = useCallback((_: DotYouClient, notification: TypedConnectionNotification) => {
    if (notification.notificationType === 'connectionFinalized') {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['active-connections'], exact: false });
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
