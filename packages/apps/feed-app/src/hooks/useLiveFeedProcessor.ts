import { useCallback } from 'react';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  DeletedHomebaseFile,
  DotYouClient,
  FileQueryParams,
  HomebaseFile,
  queryBatch,
  TargetDrive,
  TypedConnectionNotification,
} from '@homebase-id/js-lib/core';
import {
  drivesEqual,
  hasDebugFlag,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import {
  insertNewPostIntoFeed,
  invalidateComments,
  invalidateEmojiSummary,
  invalidateSocialFeeds,
  useDotYouClientContext,
  useWebsocketSubscriber,
} from '@homebase-id/common-app';
import { BlogConfig, dsrToPostFile } from '@homebase-id/js-lib/public';
import { processInbox } from '@homebase-id/js-lib/peer';
import { useChannelDrives } from '@homebase-id/common-app';
import { useWebsocketDrives } from './auth/useWebsocketDrives';

const isDebug = hasDebugFlag();

// We first process the inbox, then we connect for live updates;
export const useLiveFeedProcessor = () => {
  // Process the inbox on startup; As we want to cover the backlog of files first
  const { status: inboxStatus } = useFeedInboxProcessor(true);

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useFeedWebSocket(inboxStatus === 'success');

  return isOnline;
};

// Process the inbox on startup
const useFeedInboxProcessor = (isEnabled?: boolean) => {
  const { data: chnlDrives, isFetchedAfterMount: channelsFetched } = useChannelDrives(!!isEnabled);
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const fetchData = async () => {
    const lastCursor = queryClient.getQueryData(['cursor-feed-inbox']);
    const shouldInvalidate = lastCursor === undefined;
    const cursor = typeof lastCursor === 'string' ? lastCursor : null;

    await processInbox(dotYouClient, BlogConfig.FeedDrive, 100);

    if (shouldInvalidate) {
      isDebug && console.warn('[FeedInboxProcessor] No lastCursor');
      invalidateSocialFeeds(queryClient);
    }

    const updatedPostsResult = await findChangesSinceTimestamp(dotYouClient, cursor, {
      targetDrive: BlogConfig.FeedDrive,
      fileType: [BlogConfig.PostFileType],
    });
    const updatedPosts = updatedPostsResult.searchResults;
    isDebug && console.debug('[FeedInboxProcessor] new posts', updatedPosts.length);
    await processPostsBatch(dotYouClient, queryClient, BlogConfig.FeedDrive, updatedPosts);

    if (chnlDrives)
      await Promise.all(
        chnlDrives.map(async (chnlDrive) => {
          await processInbox(dotYouClient, chnlDrive.targetDriveInfo, 100);

          const updatedPostsResult = await findChangesSinceTimestamp(
            dotYouClient,
            cursor,
            {
              targetDrive: chnlDrive.targetDriveInfo,
              fileType: [BlogConfig.PostFileType],
            }
          );
          const updatedPosts = updatedPostsResult.searchResults;
          isDebug &&
            console.debug('[FeedInboxProcessor] new posts for channel', updatedPosts.length);
          await processPostsBatch(
            dotYouClient,
            queryClient,
            chnlDrive.targetDriveInfo,
            updatedPosts
           );
         })
       );

    return updatedPostsResult.cursorState ?? null;
  };

  return useQuery({
    queryKey: ['cursor-feed-inbox'],
    queryFn: fetchData,
    staleTime: 1000 * 10, // 10 seconds
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
          stringGuidsEqual(BlogConfig.PublicChannelDrive.type, notification.targetDrive?.type)) &&
        notification.header.fileSystemType.toLowerCase() === 'standard'
      ) {
        await internalProcessNewPost(
          dotYouClient,
          queryClient,
          BlogConfig.FeedDrive,
          notification.header
        );
      }
    },
    []
  );

  useWebsocketSubscriber(
    isEnabled && !!websocketDrives ? handler : undefined,
    undefined,
    ['fileAdded', 'fileModified', 'statisticsChanged'],
    websocketDrives as TargetDrive[],
    () => queryClient.invalidateQueries({ queryKey: ['cursor-feed-inbox'] }),
    () => queryClient.invalidateQueries({ queryKey: ['cursor-feed-inbox'] }),
    'useLiveFeedProcessor'
  );
};

const BATCH_SIZE = 2000;
const findChangesSinceTimestamp = async (
  dotYouClient: DotYouClient,
  cursor: string | null,
  params: FileQueryParams
) => {
  const newFiles = await queryBatch(dotYouClient, params, {
    maxRecords: BATCH_SIZE,
    cursorState: cursor ?? undefined,
    includeMetadataHeader: true,
    includeTransferHistory: false,
    ordering: 'newestFirst',
    sorting: 'anyChangeDate',
  });

  return newFiles;
};

const processPostsBatch = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  targetDrive: TargetDrive,
  posts: (HomebaseFile<string> | DeletedHomebaseFile<string>)[]
) => {
  await Promise.all(
    posts.map(async (postDsr) =>
      internalProcessNewPost(dotYouClient, queryClient, targetDrive, postDsr)
    )
  );
};

const internalProcessNewPost = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  targetDrive: TargetDrive,
  dsr: HomebaseFile<string> | DeletedHomebaseFile<string>
) => {
  if (dsr.fileState === 'deleted') {
    invalidateSocialFeeds(queryClient);
    return;
  }

  const post = await dsrToPostFile(dotYouClient, dsr, targetDrive, true);

  if (post) insertNewPostIntoFeed(queryClient, post);
  else invalidateSocialFeeds(queryClient);

  invalidateEmojiSummary(
    queryClient,
    post?.fileMetadata.senderOdinId,
    post?.fileMetadata.appData.content.channelId,
    post?.fileId,
    post?.fileMetadata.globalTransitId
  );

  invalidateComments(
    queryClient,
    post?.fileMetadata.senderOdinId,
    post?.fileMetadata.appData.content.channelId,
    post?.fileMetadata.globalTransitId
  );
};
