import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { BlogConfig } from '@youfoundation/js-lib/public';
import { TypedConnectionNotification } from '@youfoundation/js-lib/core';
import { getSocialFeed, processInbox } from '@youfoundation/js-lib/peer';
import { useCallback } from 'react';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useChannelDrives } from './useChannelDrives';
import { useDotYouClient } from '../auth/useDotYouClient';
import { useNotificationSubscriber } from '../transitProcessor/useNotificationSubscriber';
import { useChannels } from '../posts/channels/useChannels';

const MINUTE_IN_MS = 60000;

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

const useFeedWebsocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();

  const handler = useCallback((notification: TypedConnectionNotification) => {
    if (
      (notification.notificationType === 'fileAdded' ||
        notification.notificationType === 'fileModified') &&
      stringGuidsEqual(notification.targetDrive?.alias, BlogConfig.FeedDrive.alias) &&
      stringGuidsEqual(notification.targetDrive?.type, BlogConfig.FeedDrive.type)
    ) {
      queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
    }
  }, []);

  useNotificationSubscriber(
    isEnabled ? handler : undefined,
    ['fileAdded', 'fileModified'],
    [BlogConfig.FeedDrive]
  );
};

export const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { data: ownChannels, isFetched: channelsFetched } = useChannels({
    isAuthenticated: true,
    isOwner: true,
  });

  const { status: inboxStatus } = useInboxProcessor(true);
  useFeedWebsocket(inboxStatus === 'success');

  const fetchAll = async ({
    pageParam,
  }: {
    pageParam?: { cursorState?: string; ownerCursorState?: Record<string, string> };
  }) => {
    return await getSocialFeed(dotYouClient, pageSize, pageParam?.cursorState, {
      ownCursorState: pageParam?.ownerCursorState,
      ownChannels,
    });
  };

  return {
    fetchAll: useInfiniteQuery({
      queryKey: ['social-feeds'],
      initialPageParam: undefined as
        | { cursorState?: string; ownerCursorState?: Record<string, string> }
        | undefined,
      queryFn: ({ pageParam }) => fetchAll({ pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage &&
        lastPage?.results?.length >= 1 &&
        (lastPage?.cursorState || lastPage?.ownerCursorState)
          ? { cursorState: lastPage.cursorState, ownerCursorState: lastPage.ownerCursorState }
          : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: channelsFetched,
    }),
  };
};
