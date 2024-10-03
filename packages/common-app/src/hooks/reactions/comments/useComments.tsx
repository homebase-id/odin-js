import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getComments, ReactionContext } from '@homebase-id/js-lib/public';

import { HomebaseFile, ReactionFile } from '@homebase-id/js-lib/core';
import { useDotYouClient } from '../../auth/useDotYouClient';

const PAGE_SIZE = 30;

export interface UseCommentsVal {
  comments: HomebaseFile<ReactionFile>[];
  cursorState: string | undefined;
}

export const useComments = ({ context }: { context: ReactionContext }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const queryClient = useQueryClient();

  const fetch = async ({
    context,
    pageParam,
  }: {
    context: ReactionContext;
    pageParam?: string;
  }): Promise<UseCommentsVal> => {
    if (!context.odinId || !context.channelId || !context.target.globalTransitId)
      return { comments: [] as HomebaseFile<ReactionFile>[], cursorState: undefined };

    const response = await getComments(dotYouClient, context, PAGE_SIZE, pageParam);
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [
          'comments-summary',
          context.odinId,
          context.channelId,
          context.target.globalTransitId,
        ],
      });
    }, 100);
    return response;
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['comments', context.odinId, context.channelId, context.target.globalTransitId],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetch({ context, pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage?.comments && lastPage.comments?.length >= PAGE_SIZE
          ? lastPage.cursorState
          : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!context.odinId && !!context.channelId && !!context.target.globalTransitId,
    }),
  };
};
