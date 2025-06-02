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
  getQueryBatchCursorFromTime,
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

const MINUTE_IN_MS = 60000;

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
    const lastProcessedTime = queryClient.getQueryState(['process-feed-inbox'])?.dataUpdatedAt;
    const lastProcessedWithBuffer = lastProcessedTime && lastProcessedTime - MINUTE_IN_MS * 2;

    await processInbox(dotYouClient, BlogConfig.FeedDrive, 100);

    if (lastProcessedWithBuffer) {
      const updatedPosts = await findChangesSinceTimestamp(dotYouClient, lastProcessedWithBuffer, {
        targetDrive: BlogConfig.FeedDrive,
        fileType: [BlogConfig.PostFileType],
      });
      isDebug && console.debug('[FeedInboxProcessor] new posts', updatedPosts.length);
      await processPostsBatch(dotYouClient, queryClient, BlogConfig.FeedDrive, updatedPosts);
    }

    if (chnlDrives)
      await Promise.all(
        chnlDrives.map(async (chnlDrive) => {
          await processInbox(dotYouClient, chnlDrive.targetDriveInfo, 100);

          if (lastProcessedWithBuffer) {
            const updatedPosts = await findChangesSinceTimestamp(
              dotYouClient,
              lastProcessedWithBuffer,
              {
                targetDrive: chnlDrive.targetDriveInfo,
                fileType: [BlogConfig.PostFileType],
              }
            );
            isDebug &&
              console.debug('[FeedInboxProcessor] new posts for channel', updatedPosts.length);
            await processPostsBatch(
              dotYouClient,
              queryClient,
              chnlDrive.targetDriveInfo,
              updatedPosts
            );
          }
        })
      );

    if (!lastProcessedWithBuffer) {
      isDebug && console.warn('[FeedInboxProcessor] No lastProcessedWithBuffer');
      invalidateSocialFeeds(queryClient);
    }

    return true;
  };

  return useQuery({
    queryKey: ['process-feed-inbox'],
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
    () => queryClient.invalidateQueries({ queryKey: ['process-feed-inbox'] }),
    () => queryClient.invalidateQueries({ queryKey: ['process-feed-inbox'] }),
    'useLiveFeedProcessor'
  );
};

const BATCH_SIZE = 2000;
const findChangesSinceTimestamp = async (
  dotYouClient: DotYouClient,
  timeStamp: number,
  params: FileQueryParams
) => {
  // const modifiedCursor = getQueryModifiedCursorFromTime(timeStamp); // Friday, 31 May 2024 09:38:54.678
  const batchCursor = getQueryBatchCursorFromTime(new Date().getTime(), timeStamp);

  const newFiles = await queryBatch(dotYouClient, params, {
    maxRecords: BATCH_SIZE,
    cursorState: batchCursor,
    includeMetadataHeader: true,
    includeTransferHistory: false,
    ordering: 'newestFirst',
    sorting: 'anyChangeDate',
  });

  // const modifiedFiles = await queryModified(dotYouClient, params, {
  //   maxRecords: BATCH_SIZE,
  //   cursor: modifiedCursor + '',
  //   excludePreviewThumbnail: false,
  //   includeHeaderContent: true,
  //   includeTransferHistory: false,
  // });

  // return modifiedFiles.searchResults.concat(newFiles.searchResults);
  return newFiles.searchResults;
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
