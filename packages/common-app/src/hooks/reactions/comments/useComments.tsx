import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getComments, ReactionContext, ReactionFile } from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../../..';

const PAGE_SIZE = 30;

export interface UseCommentsVal {
  comments: ReactionFile[];
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
    if (!context.authorOdinId || !context.channelId || !context.target.globalTransitId) {
      return { comments: [] as ReactionFile[], cursorState: undefined };
    }

    const response = await getComments(dotYouClient, context, PAGE_SIZE, pageParam);
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [
          'comments-summary',
          context.authorOdinId,
          context.channelId,
          context.target.globalTransitId,
        ],
      });
    }, 100);
    return response;
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: [
        'comments',
        context.authorOdinId,
        context.channelId,
        context.target.globalTransitId,
      ],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetch({ context, pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage && lastPage.comments?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!context.authorOdinId && !!context.channelId && !!context.target.globalTransitId,
    }),
  };
};
