import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { DotYouClient, getComments, ReactionContext, ReactionFile } from '@youfoundation/js-lib';
import useAuth from '../../auth/useAuth';

const PAGE_SIZE = 30;

export interface UseCommentsVal {
  comments: ReactionFile[];
  cursorState: string | undefined;
}

const useComments = ({ context }: { context: ReactionContext }) => {
  const dotYouClient = useAuth().getDotYouClient();

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

    return await getComments(dotYouClient, context, PAGE_SIZE, pageParam);
  };

  return {
    fetch: useInfiniteQuery(
      ['comments', context.authorOdinId, context.channelId, context.target.globalTransitId],
      ({ pageParam }) => fetch({ context, pageParam }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage && lastPage.comments?.length >= PAGE_SIZE && lastPage.cursorState) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        onError: (er) => {
          console.log(er);
        },
        onSuccess: () => {
          queryClient.invalidateQueries([
            'comments-summary',
            context.authorOdinId,
            context.channelId,
            context.target.globalTransitId,
          ]);
        },
        enabled: !!context.authorOdinId && !!context.channelId && !!context.target.globalTransitId,
      }
    ),
  };
};

export default useComments;
