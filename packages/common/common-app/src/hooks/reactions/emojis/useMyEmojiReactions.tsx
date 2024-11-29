import { useQuery } from '@tanstack/react-query';
import { getMyReactions, ReactionContext } from '@homebase-id/js-lib/public';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

const PAGE_SIZE = 10;

export const useMyEmojiReactions = (context?: ReactionContext) => {
  const dotYouClient = useDotYouClientContext();
  const loggedInIdentity = dotYouClient.getLoggedInIdentity();

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
      return [];
    }
    return (
      (await getMyReactions(dotYouClient, loggedInIdentity, context, PAGE_SIZE, pageParam)) || []
    );
  };

  return {
    fetch: useQuery({
      queryKey: [
        'my-emojis',
        context?.odinId,
        context?.channelId,
        context?.target?.fileId,
        context?.target?.globalTransitId,
      ],
      queryFn: () => fetch({ context }),
      staleTime: 1000 * 60 * 2, // 2 minutes

      enabled:
        !!context?.odinId &&
        !!context?.channelId &&
        (!!context?.target?.fileId || !!context?.target?.globalTransitId),
    }),
  };
};
