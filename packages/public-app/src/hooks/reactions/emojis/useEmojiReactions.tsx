import { useInfiniteQuery } from '@tanstack/react-query';
import { DotYouClient, getReactions, ReactionContext, ReactionFile } from '@youfoundation/js-lib';
import useAuth from '../../auth/useAuth';

const PAGE_SIZE = 15;

const useEmojiReactions = (context?: ReactionContext) => {
  const dotYouClient = useAuth().getDotYouClient();

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
    fetch: useInfiniteQuery(
      [
        'emojis',
        context?.authorOdinId,
        context?.channelId,
        context?.target?.fileId,
        context?.target?.globalTransitId,
      ],
      ({ pageParam }) => fetch({ context, pageParam }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage && lastPage.reactions?.length >= PAGE_SIZE && lastPage.cursor) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        onError: (er) => {
          console.log(er);
        },
        enabled:
          !!context?.authorOdinId &&
          !!context?.channelId &&
          (!!context?.target?.fileId || !!context?.target?.globalTransitId),
      }
    ),
  };
};

export default useEmojiReactions;
