import { useQuery } from '@tanstack/react-query';
import { getReactionSummary, ReactionContext } from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../../..';
import { EmojiReactionSummary } from '@youfoundation/js-lib/core';

export const useEmojiSummary = ({
  context,
  reactionPreview,
}: {
  context: ReactionContext;
  reactionPreview?: EmojiReactionSummary;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async (context: ReactionContext): Promise<EmojiReactionSummary> => {
    if (
      !context.authorOdinId ||
      !context.channelId ||
      (!context.target.globalTransitId && !context.target.fileId)
    ) {
      return { reactions: [], totalCount: 0 };
    }

    return await getReactionSummary(dotYouClient, context);
  };

  return {
    fetch: useQuery({
      queryKey: [
        'emojis-summary',
        context.authorOdinId,
        context.channelId,
        context.target.fileId,
        context.target.globalTransitId,
      ],
      queryFn: () => fetch(context),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      gcTime: Infinity,
      initialData: reactionPreview,
      enabled:
        !!context.authorOdinId &&
        !!context.channelId &&
        (!!context.target.globalTransitId || !!context.target.fileId),
    }),
  };
};
