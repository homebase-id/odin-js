import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { TypedConnectionNotification } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useWebsocketSubscriber } from '@homebase-id/common-app';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { processInbox } from '@homebase-id/js-lib/peer';
import { useDotYouClient } from '@homebase-id/common-app';
import { useChannelDrives } from '@homebase-id/common-app';
import { websocketDrives } from './auth/useAuth';

const MINUTE_IN_MS = 60000;

// We first process the inbox, then we connect for live updates;
export const useLiveFeedProcessor = () => {
  // Process the inbox on startup; As we want to cover the backlog of files first
  const { status: inboxStatus } = useInboxProcessor(true);

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useFeedWebSocket(inboxStatus === 'success');

  return isOnline;
};

// Process the inbox on startup
const useInboxProcessor = (isEnabled?: boolean) => {
  const { data: chnlDrives, isFetchedAfterMount: channelsFetched } = useChannelDrives(!!isEnabled);
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchData = async () => {
    await processInbox(dotYouClient, BlogConfig.FeedDrive, 100);
    if (chnlDrives)
      await Promise.all(
        chnlDrives.map(async (chnlDrive) => {
          return await processInbox(dotYouClient, chnlDrive.targetDriveInfo, 100);
        })
      );

    return true;
  };

  return useQuery({
    queryKey: ['process-inbox'],
    queryFn: fetchData,
    refetchOnMount: false,
    // We want to refetch on window focus, as we might have missed some messages while the window was not focused and the websocket might have lost connection
    refetchOnWindowFocus: true,
    staleTime: MINUTE_IN_MS * 5,
    enabled: channelsFetched,
  });
};

const useFeedWebSocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();

  const handler = useCallback((notification: TypedConnectionNotification) => {
    if (
      (notification.notificationType === 'fileAdded' ||
        notification.notificationType === 'fileModified') &&
      stringGuidsEqual(notification.targetDrive?.alias, BlogConfig.FeedDrive.alias) &&
      stringGuidsEqual(notification.targetDrive?.type, BlogConfig.FeedDrive.type)
    ) {
      // TODO: insert the new post into th feed cache instead of invalidating the whole cache
      queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
    }
  }, []);

  useWebsocketSubscriber(
    isEnabled ? handler : undefined,
    ['fileAdded', 'fileModified'],
    websocketDrives,
    undefined,
    undefined,
    'useLiveFeedProcessor'
  );
};
