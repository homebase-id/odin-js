import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiType,
  BlogConfig,
  DotYouClient,
  getSocialFeed,
  TypedConnectionNotification,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
import useChannels from '../blog/useChannels';
import useNotificationSubscriber from '../transitProcessor/useNotificationSubscriber';

const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });
  const { data: ownChannels, isFetched: channelsFetched } = useChannels();

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
  }) => {
    const response = await getSocialFeed(dotYouClient, pageSize, pageParam?.cursorState, {
      ownCursorState: pageParam?.ownerCursorState,
      ownChannels,
    });

    return response;
  };

  return {
    fetchAll: useInfiniteQuery(['social-feeds'], ({ pageParam }) => fetchAll({ pageParam }), {
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length >= 1 && (lastPage?.cursorState || lastPage?.ownerCursorState)
          ? { cursorState: lastPage?.cursorState, ownerCursorState: lastPage?.ownerCursorState }
          : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: channelsFetched,
    }),
  };
};

export default useSocialFeed;
