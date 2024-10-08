import { ReactionContext } from '@homebase-id/js-lib/public';
import { Comment } from '../Comment';
import { t } from '../../../../../helpers';
import { CanReactInfo, useComments } from '../../../../../hooks';
import { CommentComposer } from '../CommentComposer';

export const CommentThread = ({
  context,
  canReact,
  isReply,
  setIsReply,
}: {
  context: ReactionContext;
  canReact?: CanReactInfo;
  isReply: boolean;
  setIsReply: (isReply: boolean) => void;
}) => {
  const {
    data: comments,
    hasNextPage,
    fetchNextPage,
  } = useComments({
    context,
  }).fetch;
  const flattenedComments = comments?.pages.flatMap((page) => page.comments).reverse();

  return (
    <>
      {hasNextPage ? (
        <a
          className="text-primary cursor-pointer pl-4 text-sm font-semibold text-opacity-80 hover:underline"
          onClick={() => fetchNextPage()}
        >
          {t('View older')}
        </a>
      ) : null}
      {context.target.globalTransitId &&
        flattenedComments?.map((comment, index) => {
          return (
            <Comment
              context={context}
              commentData={comment}
              canReact={canReact}
              key={comment.fileId || index}
              onReply={() => setIsReply(!isReply)}
              isThread={true}
            />
          );
        })}
      {isReply ? (
        <CommentComposer
          context={context}
          replyThreadId={context.target.globalTransitId}
          canReact={canReact}
          onPost={() => setIsReply(false)}
        />
      ) : null}
    </>
  );
};
