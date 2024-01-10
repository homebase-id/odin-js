import { useInfiniteQuery } from '@tanstack/react-query';
import { getReactions, ReactionContext } from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../../..';
import { ReactionFile } from '@youfoundation/js-lib/core';

const PAGE_SIZE = 15;

export const useEmojiReactions = (context?: ReactionContext) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({
    context,
    pageParam,
  }: {
    context?: ReactionContext;
    pageParam?: string;
  }) => {
    if (
      !context?.authorOdinId ||
      !context?.channelId ||
      (!context?.target?.fileId && !context?.target?.globalTransitId)
    ) {
      return { reactions: [] as ReactionFile[], cursor: undefined };
    }
    return await getReactions(dotYouClient, context, PAGE_SIZE, pageParam);
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: [
        'emojis',
        context?.authorOdinId,
        context?.channelId,
        context?.target?.fileId,
        context?.target?.globalTransitId,
      ],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetch({ context, pageParam }),
      staleTime: 1000 * 60 * 1, // 1 minute
      getNextPageParam: (lastPage) =>
        lastPage && lastPage.reactions?.length >= PAGE_SIZE ? lastPage.cursor : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled:
        !!context?.authorOdinId &&
        !!context?.channelId &&
        (!!context?.target?.fileId || !!context?.target?.globalTransitId),
    }),
  };
};
