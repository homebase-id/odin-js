import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DotYouClient, TargetDrive, TypedConnectionNotification } from '@homebase-id/js-lib/core';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  insertNewPostIntoFeed,
  invalidateEmojiSummary,
  invalidateSocialFeeds,
  useDotYouClientContext,
  useWebsocketSubscriber,
} from '@homebase-id/common-app';
import { BlogConfig, dsrToPostFile } from '@homebase-id/js-lib/public';
import { processInbox } from '@homebase-id/js-lib/peer';
import { useChannelDrives } from '@homebase-id/common-app';
import { useWebsocketDrives } from './auth/useWebsocketDrives';

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
  const dotYouClient = useDotYouClientContext();

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
    queryKey: ['process-feed-inbox'],
    queryFn: fetchData,
    staleTime: MINUTE_IN_MS * 5,
    enabled: channelsFetched,
  });
};

const useFeedWebSocket = (isEnabled: boolean) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const websocketDrives = useWebsocketDrives();

  const handler = useCallback(
    async (_: DotYouClient, notification: TypedConnectionNotification) => {
      if (
        (notification.notificationType === 'fileAdded' ||
          notification.notificationType === 'fileModified' ||
          notification.notificationType === 'statisticsChanged') &&
        (drivesEqual(notification.targetDrive, BlogConfig.FeedDrive) ||
          stringGuidsEqual(BlogConfig.PublicChannelDrive.type, notification.targetDrive?.type))
      ) {
        const post = await dsrToPostFile(
          dotYouClient,
          notification.header,
          BlogConfig.FeedDrive,
          true
        );

        if (post) insertNewPostIntoFeed(queryClient, post);
        else invalidateSocialFeeds(queryClient);

        if (notification.notificationType === 'statisticsChanged') {
          invalidateEmojiSummary(
            queryClient,
            post?.fileMetadata.senderOdinId,
            post?.fileMetadata.appData.content.channelId,
            post?.fileId,
            post?.fileMetadata.globalTransitId
          );
        }
      }
    },
    []
  );

  useWebsocketSubscriber(
    isEnabled && !!websocketDrives ? handler : undefined,
    undefined,
    ['fileAdded', 'fileModified', 'statisticsChanged'],
    websocketDrives as TargetDrive[],
    undefined,
    undefined,
    'useLiveFeedProcessor'
  );
};
