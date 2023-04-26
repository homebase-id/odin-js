import { useQuery } from '@tanstack/react-query';
import {
  DotYouClient,
  getReactionSummary,
  EmojiReactionSummary,
  ReactionContext,
} from '@youfoundation/js-lib';
import useAuth from '../../auth/useAuth';

const useEmojiSummary = ({
  context,
  reactionPreview,
}: {
  context: ReactionContext;
  reactionPreview?: EmojiReactionSummary;
}) => {
  const { getApiType, getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

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

export default useEmojiSummary;
