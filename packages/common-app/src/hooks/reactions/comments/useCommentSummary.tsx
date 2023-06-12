import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommentsReactionSummary } from '@youfoundation/js-lib/public';
import { UseCommentsVal } from './useComments';

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

    if (commentsList?.pages?.length) {
      return commentsList.pages.flatMap((page) => page.comments).length;
    }

    return reactionPreview?.totalCount || 0;
  };

  return {
    fetch: useQuery(
      ['comments-summary', authorOdinId, channelId, postGlobalTransitId],
      () => fetch({ authorOdinId, channelId, postGlobalTransitId, reactionPreview }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        onError: (er) => {
          console.log(er);
        },
        enabled: !!authorOdinId && !!channelId && !!postGlobalTransitId,
      }
    ),
  };
};

export default useCommentSummary;
