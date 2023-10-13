import { useQuery } from '@tanstack/react-query';
import { getMyReactions, ReactionContext } from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../../..';

const PAGE_SIZE = 10;

export const useMyEmojiReactions = (context?: ReactionContext) => {
  const { getDotYouClient, getIdentity } = useDotYouClient();
  const dotYouClient = getDotYouClient();

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
      return [];
    }
    return (
      (await getMyReactions(
        dotYouClient,
        getIdentity() || undefined,
        context,
        PAGE_SIZE,
        pageParam
      )) || []
    );
  };

  return {
    fetch: useQuery(
      [
        'my-emojis',
        context?.authorOdinId,
        context?.channelId,
        context?.target?.fileId,
        context?.target?.globalTransitId,
      ],
      ({ pageParam }) => fetch({ context, pageParam }),
      {
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
