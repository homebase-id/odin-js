import { lazy, useState } from 'react';
import {
  AuthorImage,
  AuthorName,
  CanReactDetails,
  t,
  useReaction,
} from '@youfoundation/common-app';

import {
  CommentReactionPreview,
  ReactionContext,
  ReactionFile,
} from '@youfoundation/js-lib/public';

import { ellipsisAtMaxChar } from '@youfoundation/common-app';

const CommentHead = lazy(() => import('./Parts/CommentHead'));
const CommentBody = lazy(() => import('./Parts/CommentBody'));
const CommentMeta = lazy(() => import('./Parts/CommentMeta'));
const CommentThread = lazy(() =>
  import('./Parts/CommentThread').then((m) => ({ default: m.CommentThread }))
);

export interface CommentProps {
  context: ReactionContext;
  canReactDetails: CanReactDetails;
  commentData: ReactionFile;
  isThread: boolean;
  onReply?: () => void;
}

export interface dirtyReactionContext extends Omit<ReactionContext, 'target'> {
  target: {
    fileId?: string;
    globalTransitId?: string;
    isEncrypted: boolean;
  };
}

export const Comment = ({
  context,
  canReactDetails,
  commentData,
  onReply,
  isThread,
}: CommentProps) => {
  const [isReply, setIsReply] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const {
    saveComment: { mutateAsync: postComment },
    removeComment: { mutateAsync: removeComment },
  } = useReaction();

  const { fileId, authorOdinId, content } = commentData;
  const threadContext: dirtyReactionContext = {
    ...context,
    target: {
      fileId: commentData.fileId,
      globalTransitId: commentData.globalTransitId,
      isEncrypted: commentData.payloadIsEncrypted || false,
    },
  };

  const doUpdate = (newBody: string, newAttachment?: File) => {
    postComment({
      ...commentData,
      content: {
        ...commentData.content,
        body: newBody,
        attachment: newAttachment,
      },
      context,
    });

    setIsEdit(false);
  };

  return (
    <>
      <div className={isThread ? 'pl-4' : ''}>
        <div className="text-foreground flex flex-row text-opacity-80">
          <div className="flex-shrink-0">
            <AuthorImage odinId={authorOdinId} size="xs" />
          </div>
          <div className="ml-2 rounded-lg bg-gray-500 bg-opacity-10 px-2 py-1 dark:bg-gray-300 dark:bg-opacity-20">
            <CommentHead
              authorOdinId={authorOdinId}
              setIsEdit={setIsEdit}
              commentBody={commentData.content.body}
              onRemove={() => removeComment({ context, commentFile: commentData })}
            />
            <CommentBody
              context={context}
              content={content}
              commentFileId={fileId}
              isEdit={isEdit}
              onUpdate={doUpdate}
            />
          </div>
        </div>
        {threadContext.target.fileId && threadContext.target.globalTransitId ? (
          <CommentMeta
            canReact={canReactDetails === 'ALLOWED'}
            threadContext={threadContext as ReactionContext}
            created={commentData.date}
            updated={commentData.updated}
            onReply={isThread ? undefined : () => (onReply ? onReply() : setIsReply(!isReply))}
          />
        ) : null}
      </div>

      {!isThread && threadContext.target.fileId && threadContext.target.globalTransitId ? (
        <>
          <CommentThread
            context={threadContext as ReactionContext}
            canReactDetails={canReactDetails}
            isReply={isReply}
            setIsReply={setIsReply}
          />
        </>
      ) : null}
    </>
  );
};

export const CommentTeaser = ({ commentData }: { commentData: CommentReactionPreview }) => {
  const { authorOdinId, content } = commentData;
  const { body } = content;

  return (
    <>
      <div className={''}>
        <div className="text-foreground flex flex-row text-sm text-opacity-50">
          <div className="flex flex-row">
            <p className="whitespace-pre-wrap">
              <span className="text-foreground font-bold text-opacity-70">
                <AuthorName odinId={authorOdinId} />
              </span>{' '}
              {commentData.payloadIsEncrypted && body === '' ? (
                <span className="ml-2 h-3 w-20 rounded bg-slate-200 text-slate-200 dark:bg-slate-700 dark:text-slate-700">
                  {t('Encrypted')}
                </span>
              ) : (
                <>{ellipsisAtMaxChar(body, 140)}</>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
