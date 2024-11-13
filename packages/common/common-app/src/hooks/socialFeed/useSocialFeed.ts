import { useInfiniteQuery } from '@tanstack/react-query';
import { getSocialFeed } from '@homebase-id/js-lib/peer';
import { useDotYouClient } from '../auth/useDotYouClient';
import { useChannels } from './channels/useChannels';

export const useSocialFeed = ({ pageSize = 10 }: { pageSize: number }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
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
