import { InfiniteData, QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getSocialFeed, RecentsFromConnectionsReturn } from '@homebase-id/js-lib/peer';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { useChannels } from './channels/useChannels';

export const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const dotYouClient = useDotYouClientContext();
  const { data: ownChannels, isFetched: channelsFetched } = useChannels({
    isAuthenticated: true,
    isOwner: true,
  });

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
  if (!currentData) return;

  const newData = transformFn(currentData);
  if (!newData) return;

  queryClient.setQueryData(['social-feeds'], newData);
  return currentData;
};
