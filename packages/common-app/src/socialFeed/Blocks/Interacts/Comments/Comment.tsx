import { useState } from 'react';
import {
  AuthorImage,
  AuthorName,
  CanReactInfo,
  ErrorNotification,
  t,
  useReaction,
} from '@youfoundation/common-app';

import {
  CommentReactionPreview,
  ReactionContext,
  ReactionFile,
} from '@youfoundation/js-lib/public';

import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import { CommentHead } from './Parts/CommentHead';
import { CommentBody } from './Parts/CommentBody';
import { CommentMeta } from './Parts/CommentMeta';
import { CommentThread } from './Parts/CommentThread';

export interface CommentProps {
  context: ReactionContext;
  canReact?: CanReactInfo;
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

export const Comment = ({ context, canReact, commentData, onReply, isThread }: CommentProps) => {
  const [isReply, setIsReply] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const {
    saveComment: { mutateAsync: postComment, error: postCommentError, status: postState },
    removeComment: { mutateAsync: removeComment, error: removeCommentError },
  } = useReaction();

  const { fileId, authorOdinId, content } = commentData;
  const threadContext: dirtyReactionContext = {
    ...context,
    target: {
      fileId: commentData.fileId,
      globalTransitId: commentData.globalTransitId,
      isEncrypted: commentData.isEncrypted || false,
    },
  };

  const doUpdate = (newBody: string, newAttachment?: File) => {
    (async () => {
      await postComment({
        ...commentData,
        content: {
          ...commentData.content,
          body: newBody,
          attachment: newAttachment,
        },
        context,
      });

      setIsEdit(false);
    })();
  };

  return (
    <>
      <ErrorNotification error={postCommentError || removeCommentError} />
      <div className={isThread ? 'pl-4' : ''}>
        <div className="text-foreground flex flex-row text-opacity-80">
          <div className="flex-shrink-0">
            <AuthorImage odinId={authorOdinId} size="xs" />
          </div>
          <div
            className={`ml-2 rounded-lg bg-gray-500 bg-opacity-10 px-2 py-1 dark:bg-gray-300 dark:bg-opacity-20 ${
              isEdit ? 'flex-grow' : ''
            }`}
          >
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
              onCancel={() => setIsEdit(false)}
              onUpdate={doUpdate}
              updateState={postState}
            />
          </div>
        </div>
        {threadContext.target.fileId && threadContext.target.globalTransitId ? (
          <CommentMeta
            canReact={canReact}
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
            canReact={canReact}
            isReply={isReply}
            setIsReply={setIsReply}
          />
        </>
      ) : null}
    </>
  );
};

const MAX_CHAR_FOR_SUMMARY = 280;

export const CommentTeaser = ({ commentData }: { commentData: CommentReactionPreview }) => {
  const { authorOdinId, content } = commentData;
  const { body, mediaPayloadKey } = content;
  const hasMedia = !!mediaPayloadKey;

  return (
    <>
      <div className={''}>
        <div className="text-foreground flex flex-row text-sm text-opacity-50">
          <div className="flex flex-row">
            <p className="whitespace-pre-wrap">
              <span className="text-foreground font-bold text-opacity-70">
                <AuthorName odinId={authorOdinId} />
              </span>{' '}
              {commentData.isEncrypted && body === '' ? (
                <span className="ml-2 h-3 w-20 rounded bg-slate-200 text-slate-200 dark:bg-slate-700 dark:text-slate-700">
                  {t('Encrypted')}
                </span>
              ) : (
                <>
                  {ellipsisAtMaxChar(body, MAX_CHAR_FOR_SUMMARY)}{' '}
                  {hasMedia ? <span className="italic">{t('Click to view image')}</span> : null}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
