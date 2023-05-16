import { useState } from 'react';
import {
  ActionGroup,
  AuthorImage,
  AuthorName,
  CanReactDetails,
  CommentComposer,
  CommentEditor,
  EmojiSummary,
  ReactionsBar,
  RichTextRenderer,
  t,
  useCommentMedia,
  useComments,
  useDotYouClient,
  useLongPress,
  useReaction,
} from '@youfoundation/common-app';

import {
  CommentReactionPreview,
  GetTargetDriveFromChannelId,
  ReactionContent,
  ReactionContext,
  ReactionFile,
  TargetDrive,
} from '@youfoundation/js-lib';

import { Ellipsis } from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app';
import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { format } from '../../../../helpers/timeago';

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
            context={context}
            canReact={canReactDetails === 'ALLOWED'}
            threadContext={threadContext as ReactionContext}
            created={commentData.date}
            updated={commentData.updated}
            onReply={() => (onReply ? onReply() : setIsReply(!isReply))}
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

const CommentHead = ({
  authorOdinId,
  setIsEdit,
  // commentBody,
  onRemove,
}: {
  authorOdinId: string;
  setIsEdit?: (isEdit: boolean) => void;
  commentBody: string;
  onRemove?: () => void;
}) => {
  const { isOwner } = useDotYouClient();

  return (
    <div className="flex flex-row">
      <AuthorName odinId={authorOdinId} />
      {isOwner && setIsEdit && onRemove ? (
        <ActionGroup
          options={[
            { label: t('Edit'), onClick: () => setIsEdit(true), icon: Pencil },
            {
              label: t('Remove'),
              onClick: onRemove,
              icon: Times,
              // TODO find better fix:
              // Confirmoptions shows a new dialog, which might appear on top of the PostPreview dialog
              // confirmOptions: {
              //   title: t('Remove comment'),
              //   body: `${t('Are you sure you want to remove your comment')}: "${commentBody}"`,
              //   buttonText: t('Remove'),
              // },
            },
          ]}
          type="mute"
          size="small"
          icon={Ellipsis}
        >
          {' '}
        </ActionGroup>
      ) : null}
    </div>
  );
};

const CommentBody = ({
  context,
  commentFileId,
  content,
  isEdit,
  onUpdate,
}: {
  context?: ReactionContext;
  commentFileId?: string;
  content: ReactionContent;
  isEdit?: boolean;
  onUpdate?: (commentBody: string, attachment?: File) => void;
}) => {
  const { body, bodyAsRichText } = content;
  const sourceTargetDrive = context && GetTargetDriveFromChannelId(context.channelId);

  return (
    <>
      {isEdit && onUpdate ? (
        <CommentEditor defaultBody={body} doPost={onUpdate} />
      ) : (
        <>
          {bodyAsRichText ? (
            <RichTextRenderer body={bodyAsRichText} />
          ) : (
            <p className="whitespace-pre-wrap">{body}</p>
          )}
          {content.hasAttachment && context ? (
            <CommentMedia
              postAuthorOdinId={context.authorOdinId}
              targetDrive={sourceTargetDrive}
              fileId={commentFileId}
            />
          ) : null}
        </>
      )}
    </>
  );
};

const CommentMedia = ({
  postAuthorOdinId,
  targetDrive,
  fileId,
}: {
  postAuthorOdinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
}) => {
  // console.log({ odinId: postAuthorOdinId, targetDrive, fileId });
  const { data: imageUrl } = useCommentMedia({
    odinId: postAuthorOdinId,
    targetDrive,
    fileId,
  }).fetch;

  if (!imageUrl?.length)
    return (
      <div className="text-foreground my-1 flex h-10 animate-pulse flex-row items-center justify-center bg-white text-sm text-opacity-50">
        {t('loading')}
      </div>
    );

  return (
    <>
      <img src={imageUrl} className="my-1" />
    </>
  );
};

const CommentMeta = ({
  context,
  canReact,
  threadContext,
  created,
  updated,
  onReply,
}: {
  context: ReactionContext;
  canReact: boolean;
  threadContext: ReactionContext;
  created?: number;
  updated?: number;
  onReply: () => void;
}) => {
  const isEdited = updated && updated !== 0 && updated !== created;

  return (
    <div className="text-foreground relative ml-[2.25rem] flex flex-row items-center px-2 pt-[2px] text-sm text-opacity-20 dark:text-opacity-30">
      {canReact ? (
        <>
          <CommenLikeButton context={context} threadContext={threadContext} />
          <span className="block px-1">·</span>
        </>
      ) : null}
      <EmojiSummary
        context={threadContext}
        className="after:content[''] text-xs after:my-auto after:ml-1 after:block after:h-3 after:border-l after:pl-1 dark:after:border-slate-600"
      />
      {canReact ? (
        <button className="text-button ml-1 mr-2 text-opacity-80 hover:underline" onClick={onReply}>
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

const CommenLikeButton = ({
  // context,
  threadContext,
}: {
  context: ReactionContext;
  threadContext: ReactionContext;
}) => {
  const [isReact, setIsReact] = useState(false);
  const { getIdentity } = useDotYouClient();

  const { mutateAsync: postReaction, error: postReactionError } = useReaction().saveEmoji;

  const doLike = () => {
    postReaction({
      authorOdinId: getIdentity() || '',
      content: { body: '❤️' },
      context: threadContext,
    });
  };

  const longPressEvent = useLongPress(() => setIsReact(true), doLike);

  return (
    <>
      <div className="relative">
        {/* Wrapper div that holds a bigger "hover target", which spans the likeButton itself as well */}
        <div
          className={`${isReact ? 'absolute' : 'contents'} -left-1 -top-10 bottom-[100%] w-[10rem]`}
          onMouseLeave={() => setIsReact(false)}
          onMouseEnter={() => setIsReact(true)}
        >
          <ReactionsBar
            className="absolute left-0 top-0"
            isActive={isReact}
            context={threadContext}
            canReactDetails="ALLOWED"
            onClose={() => setIsReact(false)}
          />
        </div>
        <button
          className="text-button ml-1 mr-1 text-opacity-80 hover:underline"
          {...longPressEvent}
          onMouseEnter={() => setIsReact(true)}
          onMouseLeave={() => setIsReact(false)}
        >
          {t('Like')}
        </button>
      </div>
      <ErrorNotification error={postReactionError} />
    </>
  );
};

const CommentThread = ({
  context,
  canReactDetails,
  isReply,
  setIsReply,
}: {
  context: ReactionContext;
  canReactDetails: CanReactDetails;
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
  const flattenedComments = comments?.pages.flatMap((page) => page.comments);

  return (
    <>
      {hasNextPage ? (
        <a
          className="text-foreground text-sm font-semibold text-opacity-20 hover:underline dark:text-opacity-30"
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
              canReactDetails={canReactDetails}
              key={comment.id || index}
              onReply={() => setIsReply(!isReply)}
              isThread={true}
            />
          );
        })}
      {isReply ? (
        <CommentComposer
          context={context}
          replyThreadId={context.target.globalTransitId}
          canReactDetails={canReactDetails}
          onPost={() => setIsReply(false)}
        />
      ) : null}
    </>
  );
};
