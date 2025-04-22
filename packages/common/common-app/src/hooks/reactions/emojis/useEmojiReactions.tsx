import { useInfiniteQuery } from '@tanstack/react-query';
import { GetTargetDriveFromChannelId, ReactionContext } from '@homebase-id/js-lib/public';

import { getReactions, EmojiReaction } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '../../auth/useOdinClientContext';

const PAGE_SIZE = 15;

export const useEmojiReactions = (context?: ReactionContext) => {
  const odinClient = useOdinClientContext();

  const fetch = async ({
    context,
    pageParam,
  }: {
    context?: ReactionContext;
    pageParam?: string;
  }) => {
    if (
      !context?.odinId ||
      !context?.channelId ||
      (!context?.target?.fileId && !context?.target?.globalTransitId)
    ) {
      return { reactions: [] as EmojiReaction[], cursor: undefined };
    }
    return await getReactions(
      odinClient,
      context.odinId,
      {
        fileId: context.target.fileId,
        globalTransitId: context.target.globalTransitId,
        targetDrive: GetTargetDriveFromChannelId(context.channelId),
      },
      PAGE_SIZE,
      pageParam
    );
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: [
        'emojis',
        context?.odinId,
        context?.channelId,
        context?.target?.fileId,
        context?.target?.globalTransitId,
      ],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetch({ context, pageParam }),
      staleTime: 1000 * 60 * 1, // 1 minute
      getNextPageParam: (lastPage) =>
        lastPage?.reactions && lastPage.reactions?.length >= PAGE_SIZE
          ? lastPage.cursor
          : undefined,
      enabled:
        !!context?.odinId &&
        !!context?.channelId &&
        (!!context?.target?.fileId || !!context?.target?.globalTransitId),
    }),
  };
};
