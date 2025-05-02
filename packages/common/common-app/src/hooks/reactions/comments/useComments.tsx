import { QueryClient, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getComments, ReactionContext } from '@homebase-id/js-lib/public';
import { HomebaseFile, CommentReaction } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '../../auth/useOdinClientContext';
import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { invalidateCommentSummary } from './useCommentSummary';

const PAGE_SIZE = 30;

export interface UseCommentsVal {
  comments: HomebaseFile<CommentReaction>[];
  cursorState: string | undefined;
}

export const useComments = ({ context }: { context: ReactionContext }) => {
  const odinClient = useOdinClientContext();

  const queryClient = useQueryClient();

  const fetch = async ({
    context,
    pageParam,
  }: {
    context: ReactionContext;
    pageParam?: string;
  }): Promise<UseCommentsVal> => {
    if (!context.odinId || !context.channelId || !context.target.globalTransitId)
      return { comments: [] as HomebaseFile<CommentReaction>[], cursorState: undefined };

    const response = await getComments(odinClient, context, PAGE_SIZE, pageParam);
    setTimeout(() => {
      invalidateCommentSummary(
        queryClient,
        context.odinId,
        context.channelId,
        context.target.globalTransitId
      );
    }, 100);
    return response;
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: [
        'comments',
        context.odinId,
        formatGuidId(context.channelId),
        formatGuidId(context.target.globalTransitId),
      ],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetch({ context, pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage?.comments && lastPage.comments?.length >= PAGE_SIZE
          ? lastPage.cursorState
          : undefined,
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!context.odinId && !!context.channelId && !!context.target.globalTransitId,
    }),
  };
};

export const invalidateComments = (
  queryClient: QueryClient,
  senderOdinId?: string,
  channelId?: string,
  globalTransitId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['comments', senderOdinId, formatGuidId(channelId), formatGuidId(globalTransitId)],
    exact: !!senderOdinId && !!channelId && !!globalTransitId,
  });
};
