import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { BlogConfig } from '@youfoundation/js-lib/public';

import { useChannels, useDotYouClient } from '@youfoundation/common-app';
import { useNotificationSubscriber } from '@youfoundation/common-app';
import { ApiType, TypedConnectionNotification } from '@youfoundation/js-lib/core';
import { getSocialFeed } from '@youfoundation/js-lib/peer';
import { useCallback, useEffect, useState } from 'react';
import { preAuth } from '@youfoundation/js-lib/auth';

export const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const [preAuthenticated, setIspreAuthenticated] = useState(false);
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { data: ownChannels, isFetched: channelsFetched } = useChannels({
    isAuthenticated: true,
    isOwner: true,
  });

  // Add invalidation of social feed when a new file is added to the feed drive (this enforces that only remote updates trigger a refresh)
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      if (!preAuthenticated && dotYouClient.getType() === ApiType.App) {
        await preAuth(dotYouClient);
        setIspreAuthenticated(true);
      }
    })();
  }, [preAuthenticated]);

  const handler = useCallback((notification: TypedConnectionNotification) => {
    if (
      notification.notificationType === 'fileAdded' &&
      notification.targetDrive?.alias === BlogConfig.FeedDrive.alias &&
      notification.targetDrive?.type === BlogConfig.FeedDrive.type
    ) {
      console.debug({ notification });
      queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
    }
  }, []);
  useNotificationSubscriber(preAuthenticated ? handler : undefined, ['fileAdded']);

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
