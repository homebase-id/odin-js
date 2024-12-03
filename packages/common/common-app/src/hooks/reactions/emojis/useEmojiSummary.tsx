import { useQuery } from '@tanstack/react-query';
import {
  EmojiReactionSummary,
  getReactionSummary,
  ReactionContext,
} from '@homebase-id/js-lib/public';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

export const useEmojiSummary = ({
  context,
  reactionPreview,
}: {
  context: ReactionContext;
  reactionPreview?: EmojiReactionSummary;
}) => {
  const dotYouClient = useDotYouClientContext();

  const fetch = async (context: ReactionContext): Promise<EmojiReactionSummary> => {
    if (
      !context.odinId ||
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
        context.odinId,
        context.channelId,
        context.target.fileId,
        context.target.globalTransitId,
      ],
      queryFn: () => fetch(context),
      staleTime: 1000 * 60 * 1, // 1 minute
      gcTime: Infinity,
      initialData: reactionPreview,
      // By default, initialData is treated as totally fresh, as if it were just fetched. This also means that it will affect how it is interpreted by the staleTime option.
      enabled:
        !!context.odinId &&
        !!context.channelId &&
        (!!context.target.globalTransitId || !!context.target.fileId),
    }),
  };
};
