import {
  PostFile,
  PostContent,
  ReactionContext,
  EmojiReactionSummary,
  CommentsReactionSummary,
} from '@youfoundation/js-lib/public';
import { Suspense, useState } from 'react';
import {
  Bubble,
  t,
  useCanReact,
  useCommentSummary,
  useComments,
  useEmojiSummary,
  Repost,
  Share,
  HOME_ROOT_PATH,
  CanReactInfo,
} from '../../../..';

import { CommentTeaser } from './Comments/Comment';
import { CommentComposer } from './Comments/CommentComposer';
import { LikeButton } from './Reactions/LikeButton';

import { Comment } from '@youfoundation/common-app';
import { ReactionDetailsDialog } from './ReactionDetailsDialog/ReactionDetailsDialog';
import { RepostDialog } from './RepostDialog/RepostDialog';
import { ShareDialog } from './ShareDialog/ShareDialog';

export const PostInteracts = ({
  authorOdinId,
  postFile,

  isAuthenticated,
  isOwner,
  isPublic,
  defaultExpanded,
  allowExpand = true,
  showSummary = false,
  className,
  login,
}: {
  authorOdinId: string;
  postFile: PostFile<PostContent>;

  isAuthenticated?: boolean;
  isOwner?: boolean;
  isPublic?: boolean;
  defaultExpanded?: boolean;
  allowExpand?: boolean;
  showSummary?: boolean;
  className?: string;
  login?: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hasIntentToReact, setHasIntentToReact] = useState(false);
  const toggleable = !defaultExpanded && allowExpand;

  const postDisabledEmoji =
    postFile.content.reactAccess !== undefined &&
    (postFile.content.reactAccess === false || postFile.content.reactAccess === 'comment');
  const postDisabledComment =
    postFile.content.reactAccess !== undefined &&
    (postFile.content.reactAccess === false || postFile.content.reactAccess === 'emoji');

  const { data: canReact } = useCanReact({
    authorOdinId,
    channelId: postFile.content.channelId,
    postContent: postFile.content,
    isEnabled: !!isExpanded || !!hasIntentToReact,
    isAuthenticated: isAuthenticated ?? false,
    isOwner: isOwner ?? false,
  });

  if (!postFile.globalTransitId || !postFile.fileId) return null;

  const reactionContext: ReactionContext = {
    authorOdinId: authorOdinId,
    channelId: postFile.content.channelId,
    target: {
      globalTransitId: postFile.globalTransitId, // TODO: remove 'unknown' fallback
      fileId: postFile.fileId, // TODO: remove 'unknown' fallback
      isEncrypted: postFile.payloadIsEncrypted || false,
    },
  };

  const permalink = `https://${authorOdinId}${HOME_ROOT_PATH}posts/${postFile.content.channelId}/${
    postFile.content.slug ?? postFile.content.id
  }`;

  return (
    <div className={`${className ?? ''}`}>
      <div
        className={`mt-auto flex text-foreground items-center pb-4 text-sm text-opacity-20 dark:text-opacity-30`}
      >
        {!postDisabledEmoji ? (
          <LikeButton
            context={reactionContext}
            onIntentToReact={() => setHasIntentToReact(true)}
            canReact={canReact}
          />
        ) : null}
        <EmojiSummary
          context={reactionContext}
          reactionPreview={postFile.reactionPreview?.reactions}
          className="ml-2"
        />
        <div
          className="ml-auto flex flex-row items-center gap-2 font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          {isPublic ? <ShareButton permalink={permalink} title={postFile.content.caption} /> : null}
          {isOwner && isPublic ? <RepostButton postFile={postFile} permalink={permalink} /> : null}
          {!postDisabledComment ? (
            <button
              className={`inline-flex items-center hover:text-black dark:hover:text-white ${
                !toggleable ? 'pointer-events-none' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (toggleable) setIsExpanded(!isExpanded);
              }}
            >
              <Bubble className="inline-block h-6 w-6" />
              <span className="sr-only">{t('Toggle comments')}</span>
            </button>
          ) : null}
          {!showSummary ? (
            <CommentSummary
              context={reactionContext}
              reactionPreview={postFile.reactionPreview?.comments}
              onToggle={() => toggleable && setIsExpanded(!isExpanded)}
            />
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <div
          className="grid cursor-default grid-flow-row gap-2  pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <hr className="mb-4 dark:border-t-gray-300 dark:border-opacity-20" />
          <Suspense fallback={null}>
            <CommentList context={reactionContext} canReact={canReact} login={login} />
          </Suspense>
        </div>
      ) : showSummary ? (
        <CommentTeaserList
          reactionPreview={postFile.reactionPreview?.comments}
          onExpand={() => setIsExpanded(true)}
        />
      ) : null}
    </div>
  );
};

export const ShareButton = ({ permalink, title }: { permalink: string; title?: string }) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  // if (!navigator.share) return null;

  return (
    <>
      <button
        className="inline-flex items-center hover:text-black dark:hover:text-white"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (navigator.share) navigator.share({ url: permalink });
          else setShowShareDialog(true);
        }}
      >
        <Share className="inline-block h-6 w-6" />
        <span className="sr-only">{t('Share')}</span>
      </button>
      {showShareDialog ? (
        <ShareDialog onClose={() => setShowShareDialog(false)} href={permalink} title={title} />
      ) : null}
    </>
  );
};

export const RepostButton = ({
  postFile,
  permalink,
}: {
  postFile: PostFile<PostContent>;
  permalink: string;
}) => {
  const [isRepostDialogOpen, setIsReposeDialogOpen] = useState(false);

  return (
    <>
      <button
        className={`inline-flex items-center hover:text-black dark:hover:text-white`}
        onClick={(e) => {
          e.preventDefault();
          setIsReposeDialogOpen(!isRepostDialogOpen);
        }}
      >
        <Repost className="inline-block h-5 w-5" />
        <span className="sr-only">{t('Repost')}</span>
      </button>
      {isRepostDialogOpen ? (
        <RepostDialog
          embeddedPost={{
            ...postFile.content,
            permalink,
            userDate: postFile.userDate,
            previewThumbnail: postFile.previewThumbnail,
          }}
          isOpen={isRepostDialogOpen}
          onClose={() => setIsReposeDialogOpen(false)}
        />
      ) : null}
    </>
  );
};

export const EmojiSummary = ({
  context,
  className,
  reactionPreview,
}: {
  context: ReactionContext;
  className?: string;
  reactionPreview?: EmojiReactionSummary;
}) => {
  const { data: reactionSummary } = useEmojiSummary({
    context,
    reactionPreview: reactionPreview,
  }).fetch;
  const [isShowDetails, setIsShowDetails] = useState(false);

  return reactionSummary && reactionSummary.totalCount > 0 ? (
    <span onClick={(e) => e.stopPropagation()}>
      <span
        className={`hover:text-primary flex cursor-pointer flex-row items-center ${
          className ?? ''
        }`}
        onClick={() => setIsShowDetails(true)}
      >
        {reactionSummary.totalCount}
        <span className="text-foreground ml-1 flex flex-row pr-1">
          {reactionSummary.reactions.slice(0, 5).map((reaction) => (
            <span className="-mr-1 block rounded-full p-[2px] last:mr-0" key={reaction.emoji}>
              {reaction.emoji}
            </span>
          ))}
        </span>
      </span>
      {isShowDetails ? (
        <ReactionDetailsDialog
          isOpen={isShowDetails}
          onClose={() => setIsShowDetails(false)}
          context={context}
        />
      ) : null}
    </span>
  ) : null;
};

export const CommentSummary = ({
  context,
  onToggle,
  reactionPreview,
}: {
  context: ReactionContext;
  onToggle?: () => void;
  reactionPreview?: CommentsReactionSummary;
}) => {
  const { data: totalCount } = useCommentSummary({
    authorOdinId: context.authorOdinId,
    channelId: context.channelId,
    postGlobalTransitId: context.target.globalTransitId,
    reactionPreview: reactionPreview,
  }).fetch;

  return totalCount ? (
    <>
      <span className="block">·</span>
      <button
        onClick={(e) => {
          if (onToggle) {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`${
          onToggle
            ? 'text-primary hover:text-primary cursor-pointer text-opacity-80 hover:underline'
            : 'pointer-events-none'
        }`}
      >
        {totalCount} {(totalCount || 0) > 1 ? t('comments') : t('comment')}
      </button>
    </>
  ) : null;
};

const CommentTeaserList = ({
  reactionPreview,
  onExpand,
}: {
  reactionPreview?: CommentsReactionSummary;
  onExpand: () => void;
}) => {
  if (!reactionPreview?.comments.length) return null;

  const allEncrypted = reactionPreview.comments.every((comment) => comment.payloadIsEncrypted);

  return (
    <div className="mb-5">
      <hr className="mb-4 dark:border-t-gray-300 dark:border-opacity-20"></hr>

      <div
        className="flex cursor-pointer flex-col gap-[0.2rem]"
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
      >
        {reactionPreview.comments.slice(0, 3).map((comment, index) => (
          <CommentTeaser commentData={comment} key={index} />
        ))}
      </div>
      {reactionPreview?.totalCount > 3 || allEncrypted ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="text-primary text-sm font-bold text-opacity-80 hover:underline"
        >
          {`${!allEncrypted ? t('View') : t('Decrypt')} ${reactionPreview.totalCount} ${
            reactionPreview.totalCount > 1 ? t('comments') : t('comment')
          }`}
        </button>
      ) : null}
    </div>
  );
};

const CommentList = ({
  context,
  canReact,
  login,
}: {
  context: ReactionContext;
  canReact?: CanReactInfo;
  login?: () => void;
}) => {
  const { data: comments, hasNextPage, fetchNextPage } = useComments({ context }).fetch;
  const flattenedComments = comments?.pages.flatMap((page) => page.comments).reverse();

  return (
    <>
      {hasNextPage ? (
        <a
          className="text-primary cursor-pointer text-sm font-semibold text-opacity-80 hover:underline"
          onClick={() => fetchNextPage()}
        >
          {t('View older')}
        </a>
      ) : null}
      {flattenedComments?.map((comment, index) => (
        <Comment
          context={context}
          canReact={canReact}
          commentData={comment}
          key={comment.id ?? index}
          isThread={false}
        />
      ))}
      <CommentComposer context={context} canReact={canReact} login={login} />
    </>
  );
};
