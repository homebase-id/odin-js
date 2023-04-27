import { useQuery } from '@tanstack/react-query';
import { DotYouClient, getMyReactions, ReactionContext } from '@youfoundation/js-lib';
import useAuth from '../../auth/useAuth';

const PAGE_SIZE = 10;

const useEmojiReactions = (context?: ReactionContext) => {
  const { getDotYouClient, getIdentity } = useAuth();
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
        getIdentity() || window.location.hostname,
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

export default useEmojiReactions;
