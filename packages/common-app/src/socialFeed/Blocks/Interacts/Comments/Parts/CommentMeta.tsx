import { EmojiSummary, t } from '@youfoundation/common-app';
import { ReactionContext } from '@youfoundation/js-lib/public';
import { format } from '../../../../../helpers/timeago/format';
import { lazy } from 'react';

const CommentLikeButton = lazy(() => import('./CommentLikeButton'));

const CommentMeta = ({
  canReact,
  threadContext,
  created,
  updated,
  onReply,
}: {
  canReact: boolean;
  threadContext: ReactionContext;
  created?: number;
  updated?: number;
  onReply?: () => void;
}) => {
  const isEdited = updated && updated !== 0 && updated !== created;

  return (
    <div className="text-foreground relative ml-[2.25rem] flex flex-row items-center px-2 pt-[2px] text-sm text-opacity-20 dark:text-opacity-30">
      {canReact ? (
        <>
          <CommentLikeButton threadContext={threadContext} />
          <span className="block px-1">·</span>
        </>
      ) : null}
      <EmojiSummary
        context={threadContext}
        className="after:content[''] text-xs after:my-auto after:ml-1 after:block after:h-3 after:border-l after:pl-1 dark:after:border-slate-600"
      />
      {canReact && onReply ? (
        <button
          className="text-primary ml-1 mr-2 text-opacity-80 hover:underline"
          onClick={onReply}
        >
          {t('Reply')}
        </button>
      ) : null}
      {created ? (
        <p className="mr-2">
          {format(new Date(isEdited ? updated : created))}
          {isEdited ? <> - {t('Edited')}</> : null}
        </p>
      ) : null}
    </div>
  );
};

export default CommentMeta;
