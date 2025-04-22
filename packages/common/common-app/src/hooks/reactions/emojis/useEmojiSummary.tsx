import { QueryClient, useQuery } from '@tanstack/react-query';
import {
  EmojiReactionSummary,
  getReactionSummary,
  ReactionContext,
} from '@homebase-id/js-lib/public';
import { useOdinClientContext } from '../../auth/useOdinClientContext';
import { formatGuidId } from '@homebase-id/js-lib/helpers';

export const useEmojiSummary = ({
  context,
  reactionPreview,
}: {
  context: ReactionContext;
  reactionPreview?: EmojiReactionSummary;
}) => {
  const odinClient = useOdinClientContext();

  const fetch = async (context: ReactionContext): Promise<EmojiReactionSummary> => {
    if (
      !context.odinId ||
      !context.channelId ||
      (!context.target.globalTransitId && !context.target.fileId)
    ) {
      return { reactions: [], totalCount: 0 };
    }

    return await getReactionSummary(odinClient, context);
  };

  return {
    fetch: useQuery({
      queryKey: [
        'emojis-summary',
        context.odinId,
        formatGuidId(context.channelId),
        formatGuidId(context.target.fileId),
        formatGuidId(context.target.globalTransitId),
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

export const invalidateEmojiSummary = (
  queryClient: QueryClient,
  senderOdinId?: string,
  channelId?: string,
  fileId?: string,
  globalTransitId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: [
      'emojis-summary',
      senderOdinId,
      formatGuidId(channelId),
      formatGuidId(fileId),
      formatGuidId(globalTransitId),
    ],
    exact: !!senderOdinId && !!channelId && !!fileId && !!globalTransitId,
  });
};
