import { useState } from 'react';
import {
  RawReactionContent,
  ReactionContext,
  CommentReactionPreview,
} from '@homebase-id/js-lib/public';

import { CommentHead } from './Parts/CommentHead';
import { CommentBody } from './Parts/CommentBody';
import { CommentMeta } from './Parts/CommentMeta';
import { CommentThread } from './Parts/CommentThread';
import { HomebaseFile, NewHomebaseFile, ReactionFile } from '@homebase-id/js-lib/core';
import { CanReactInfo } from '../../../../hooks/reactions/useCanReact';
import { useReaction } from '../../../../hooks/reactions/useReaction';
import { ErrorNotification } from '../../../../ui/Alert/ErrorNotification';
import { AuthorImage } from '../../Author/Image';
import { AuthorName } from '../../Author/Name';
import { ellipsisAtMaxChar } from '../../../../helpers/common';
import { t } from '../../../../helpers/i18n/dictionary';

export interface CommentProps {
  context: ReactionContext;
  canReact?: CanReactInfo;
  commentData: HomebaseFile<ReactionFile> | NewHomebaseFile<RawReactionContent>;
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

  const fileId = commentData.fileId;
  const commentContent = commentData.fileMetadata.appData.content;
  const authorOdinId = commentContent.authorOdinId || commentData.fileMetadata.originalAuthor || '';

  const threadContext: dirtyReactionContext = {
    ...context,
    target: {
      fileId: commentData.fileId,
      globalTransitId: (commentData as HomebaseFile<ReactionFile>).fileMetadata.globalTransitId,
      isEncrypted: (commentData as HomebaseFile<ReactionFile>).fileMetadata.isEncrypted || false,
    },
  };

  const doUpdate = (newBody: string, newAttachment?: File) => {
    (async () => {
      await postComment({
        context,
        commentData: {
          ...commentData,
          fileMetadata: {
            ...commentData.fileMetadata,
            appData: {
              ...commentData.fileMetadata.appData,

              content: {
                ...commentData.fileMetadata.appData.content,
                body: newBody,
                attachment: newAttachment,
              },
            },
          },
        },
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
            className={`ml-2 rounded-lg bg-gray-500 bg-opacity-10 px-2 py-1 dark:bg-gray-300 dark:bg-opacity-20 w-20 flex-grow ${
              isEdit ? 'flex-grow' : ''
            }`}
          >
            <CommentHead
              authorOdinId={authorOdinId}
              setIsEdit={setIsEdit}
              commentBody={commentContent.body}
              onRemove={
                commentData.fileId
                  ? () =>
                      removeComment({
                        context,
                        commentFile: commentData as HomebaseFile<ReactionFile>,
                      })
                  : undefined
              }
            />
            <CommentBody
              context={context}
              content={commentContent}
              previewThumbnail={commentData.fileMetadata.appData.previewThumbnail}
              commentFileId={fileId}
              commentLastModifed={(commentData as HomebaseFile<ReactionFile>).fileMetadata.updated}
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
            created={(commentData as HomebaseFile<ReactionFile>).fileMetadata.created}
            updated={(commentData as HomebaseFile<ReactionFile>).fileMetadata.updated}
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
  const { authorOdinId, body, mediaPayloadKey } = commentData;
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
                  {ellipsisAtMaxChar(body, MAX_CHAR_FOR_SUMMARY)}
                  {hasMedia ? (
                    <span className="italic lowercase">{t('Click to view image')}</span>
                  ) : null}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
