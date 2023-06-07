import { useQuery } from '@tanstack/react-query';
import {
  getReactionSummary,
  EmojiReactionSummary,
  ReactionContext,
} from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../../..';

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
    fetch: useQuery(
      [
        'emojis-summary',
        context.authorOdinId,
        context.channelId,
        context.target.fileId,
        context.target.globalTransitId,
      ],
      () => fetch(context),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: 3600,
        onError: (er) => {
          console.log(er);
        },
        initialData: reactionPreview,
        enabled:
          !!context.authorOdinId &&
          !!context.channelId &&
          (!!context.target.globalTransitId || !!context.target.fileId),
      }
    ),
  };
};
