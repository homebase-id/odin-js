import { InfiniteData, QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { UseCommentsVal } from './useComments';
import { CommentsReactionSummary } from '@homebase-id/js-lib/public';
import { formatGuidId } from '@homebase-id/js-lib/helpers';

export const useCommentSummary = ({
  authorOdinId,
  channelId,
  postGlobalTransitId,
  reactionPreview,
}: {
  authorOdinId?: string;
  channelId?: string;
  postGlobalTransitId?: string;
  reactionPreview?: CommentsReactionSummary;
}) => {
  const queryClient = useQueryClient();

  const fetch = async ({
    authorOdinId,
    channelId,
    postGlobalTransitId,
    reactionPreview,
  }: {
    authorOdinId?: string;
    channelId?: string;
    postGlobalTransitId?: string;
    reactionPreview?: CommentsReactionSummary;
  }): Promise<number> => {
    if (!authorOdinId || !channelId || !postGlobalTransitId) {
      return 0;
    }

    const commentsList = queryClient.getQueryData<InfiniteData<UseCommentsVal>>([
      'comments',
      authorOdinId,
      channelId,
      postGlobalTransitId,
    ]);

    if (commentsList?.pages?.length)
      return commentsList.pages.flatMap((page) => page.comments).length;

    return reactionPreview?.totalCount || 0;
  };

  return {
    fetch: useQuery({
      queryKey: [
        'comments-summary',
        authorOdinId,
        formatGuidId(channelId),
        formatGuidId(postGlobalTransitId),
      ],
      queryFn: () => fetch({ authorOdinId, channelId, postGlobalTransitId, reactionPreview }),
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!authorOdinId && !!channelId && !!postGlobalTransitId,
    }),
  };
};

export const invalidateCommentSummary = (
  queryClient: QueryClient,
  senderOdinId?: string,
  channelId?: string,
  globalTransitId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: [
      'comments-summary',
      senderOdinId,
      formatGuidId(channelId),
      formatGuidId(globalTransitId),
    ],
    exact: !!senderOdinId && !!channelId && !!globalTransitId,
  });
};
