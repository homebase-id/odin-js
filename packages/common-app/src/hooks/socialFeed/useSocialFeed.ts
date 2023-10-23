import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { BlogConfig } from '@youfoundation/js-lib/public';

import { useChannels, useDotYouClient } from '@youfoundation/common-app';
import { useNotificationSubscriber } from '@youfoundation/common-app';
import { TypedConnectionNotification } from '@youfoundation/js-lib/core';
import { getSocialFeed } from '@youfoundation/js-lib/transit';

export const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { data: ownChannels, isFetched: channelsFetched } = useChannels({
    isAuthenticated: true,
    isOwner: true,
  });

  // Add invalidation of social feed when a new file is added to the feed drive (this enforces that only remote updates trigger a refresh)
  const queryClient = useQueryClient();
  const handler = (notification: TypedConnectionNotification) => {
    if (
      notification.notificationType === 'fileAdded' &&
      notification.targetDrive?.alias === BlogConfig.FeedDrive.alias &&
      notification.targetDrive?.type === BlogConfig.FeedDrive.type
    ) {
      console.log({ notification });
      queryClient.invalidateQueries(['social-feeds']);
    }
  };
  useNotificationSubscriber(handler, ['fileAdded']);

  const fetchAll = async ({
    pageParam,
  }: {
    pageParam?: { cursorState: string; ownerCursorState: Record<string, string> };
  }) =>
    await getSocialFeed(dotYouClient, pageSize, pageParam?.cursorState, {
      ownCursorState: pageParam?.ownerCursorState,
      ownChannels,
    });

  return {
    fetchAll: useInfiniteQuery(['social-feeds'], ({ pageParam }) => fetchAll({ pageParam }), {
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length >= 1 && (lastPage?.cursorState || lastPage?.ownerCursorState)
          ? { cursorState: lastPage?.cursorState, ownerCursorState: lastPage?.ownerCursorState }
          : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: channelsFetched,
    }),
  };
};
