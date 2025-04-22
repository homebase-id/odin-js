import { InfiniteData, QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getSocialFeed, RecentsFromConnectionsReturn } from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '../auth/useOdinClientContext';
import { useChannels } from './channels/useChannels';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { PostContent } from '@homebase-id/js-lib/public';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const odinClient = useOdinClientContext();
  const { data: ownChannels, isFetched: channelsFetched } = useChannels({
    isAuthenticated: true,
    isOwner: true,
  });

  const fetchAll = async ({
    pageParam,
  }: {
    pageParam?: { cursorState?: string; ownerCursorState?: Record<string, string> };
  }) => {
    return await getSocialFeed(odinClient, pageSize, pageParam?.cursorState, {
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
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: channelsFetched,
    }),
  };
};

export const invalidateSocialFeeds = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
};

export const updateCacheSocialFeeds = (
  queryClient: QueryClient,
  transformFn: (
    data: InfiniteData<RecentsFromConnectionsReturn>
  ) => InfiniteData<RecentsFromConnectionsReturn> | undefined
) => {
  const currentData = queryClient.getQueryData<InfiniteData<RecentsFromConnectionsReturn>>([
    'social-feeds',
  ]);
  if (!currentData || !currentData?.pages?.length) return;

  const newData = transformFn(currentData);
  if (!newData) return;

  queryClient.setQueryData(['social-feeds'], newData);
  return currentData;
};

export const insertNewPostIntoFeed = (
  queryClient: QueryClient,
  newPost: HomebaseFile<PostContent>
) => {
  const existingSocialFeed = updateCacheSocialFeeds(queryClient, (data) => {
    if (!data.pages || data.pages.length === 0) return;

    const isNewFile = !data.pages.some((page) =>
      page.results.some(
        (post) =>
          (newPost.fileId && stringGuidsEqual(post?.fileId, newPost?.fileId)) ||
          (newPost.fileMetadata.appData.uniqueId &&
            stringGuidsEqual(
              post?.fileMetadata.appData.uniqueId,
              newPost.fileMetadata.appData.uniqueId
            ))
      )
    );

    const newData = {
      ...data,
      pages: data?.pages?.map((page, index) => {
        if (isNewFile) {
          const filteredResults = page.results.filter(
            // Remove messages with the same fileId but more importantly uniqueId/globalTransitId so we avoid duplicates with the optimistic update
            (post) => {
              if (!post) return false;

              if (newPost.fileMetadata.appData.uniqueId) {
                return !stringGuidsEqual(
                  post?.fileMetadata.appData.uniqueId,
                  newPost.fileMetadata.appData.uniqueId
                );
              } else if (newPost.fileMetadata.globalTransitId) {
                return !stringGuidsEqual(
                  post?.fileMetadata.globalTransitId,
                  newPost.fileMetadata.globalTransitId
                );
              } else if (newPost.fileId) {
                return !stringGuidsEqual(post?.fileId, newPost.fileId);
              }

              return true;
            }
          ) as HomebaseFile<PostContent>[];

          return {
            ...page,
            results:
              index === 0
                ? [newPost, ...filteredResults].sort(
                  (a, b) =>
                    (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
                    (a.fileMetadata.appData.userDate || a.fileMetadata.created)
                ) // Re-sort the first page, as the new message might be older than the first message in the page;
                : filteredResults,
          };
        }

        return {
          ...page,
          results: page.results.reduce((acc, msg) => {
            if (!msg) return acc;

            // FileId Duplicates: Message with same fileId is already in results
            if (msg.fileId && acc.some((m) => stringGuidsEqual(m?.fileId, msg.fileId))) {
              return acc;
            }

            // UniqueId Duplicates: Message with same uniqueId is already in results
            if (
              msg.fileMetadata.appData.uniqueId &&
              acc.some((m) =>
                stringGuidsEqual(
                  m?.fileMetadata.appData.uniqueId,
                  msg.fileMetadata.appData.uniqueId
                )
              )
            ) {
              return acc;
            }

            // GlobalTransitId Duplicates: Message with same globalTransitId is already in results
            if (
              msg.fileMetadata.globalTransitId &&
              acc.some((m) =>
                stringGuidsEqual(m?.fileMetadata.globalTransitId, msg.fileMetadata.globalTransitId)
              )
            ) {
              return acc;
            }

            // Message in cache was from the server, then updating with fileId is enough
            if (msg.fileId && stringGuidsEqual(msg.fileId, newPost.fileId)) {
              acc.push(newPost);
              return acc;
            }

            // Message in cache is from unknown, then ensure if we need to update the message based on uniqueId
            if (
              msg.fileMetadata.appData.uniqueId &&
              stringGuidsEqual(
                msg.fileMetadata.appData.uniqueId,
                newPost.fileMetadata.appData.uniqueId
              )
            ) {
              acc.push(newPost);
              return acc;
            }

            acc.push(msg);
            return acc;
          }, [] as HomebaseFile<PostContent>[]),
        };
      }),
    };

    return newData;
  });

  if (!existingSocialFeed) {
    invalidateSocialFeeds(queryClient);
  }
};
