import { useQuery } from '@tanstack/react-query';
import { getMyReactions, ReactionContext } from '@homebase-id/js-lib/public';
import { useDotYouClient } from '../../auth/useDotYouClient';

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
    fetch: useQuery({
      queryKey: [
        'my-emojis',
        context?.authorOdinId,
        context?.channelId,
        context?.target?.fileId,
        context?.target?.globalTransitId,
      ],
      queryFn: () => fetch({ context }),

      refetchOnMount: false,
      refetchOnWindowFocus: false,

      enabled:
        !!context?.authorOdinId &&
        !!context?.channelId &&
        (!!context?.target?.fileId || !!context?.target?.globalTransitId),
    }),
  };
};
