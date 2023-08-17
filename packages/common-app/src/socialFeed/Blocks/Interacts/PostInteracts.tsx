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
  CanReactDetails,
  useCanReact,
  useCommentSummary,
  useComments,
  useEmojiSummary,
  Repost,
  Share,
  HOME_ROOT_PATH,
} from '../../../..';

import { CommentTeaser } from './Comments/Comment';
import { CommentComposer } from './Comments/CommentComposer';
import { LikeButton } from './Reactions/LikeButton';

import { Comment } from '@youfoundation/common-app';
import { ReactionDetailsDialog } from './ReactionDetailsDialog/ReactionDetailsDialog';
import { RepostDialog } from './RepostDialog/RepostDialog';

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
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hasIntentToReact, setHasIntentToReact] = useState(false);
  const toggleable = !defaultExpanded && allowExpand;

  const reactionContext: ReactionContext = {
    authorOdinId: authorOdinId,
    channelId: postFile.content.channelId,
    target: {
      globalTransitId: postFile.globalTransitId ?? 'unknown',
      fileId: postFile.fileId ?? 'unknown',
      isEncrypted: postFile.payloadIsEncrypted || false,
    },
  };

  const { data } = useCanReact({
    authorOdinId,
    channelId: postFile.content.channelId,
    postId: postFile.content.id,
    isEnabled: !!isExpanded || !!hasIntentToReact,
    isAuthenticated: isAuthenticated || false,
    isOwner: isOwner || false,
  });
  const canReactDetails = data?.canReact ? 'ALLOWED' : data?.details;

  const permalink = `https://${authorOdinId}${HOME_ROOT_PATH}posts/${postFile.content.channelId}/${
    postFile.content.slug ?? postFile.content.id
  }`;

  return (
    <div className={`${className ?? ''}`}>
      <div
        className={`mt-auto flex ${
          allowExpand ? 'cursor-default' : ''
        } text-foreground items-center pb-4 text-sm text-opacity-20 dark:text-opacity-30`}
        onClick={(e) => allowExpand && e.stopPropagation()}
      >
        <LikeButton
          context={reactionContext}
          onIntentToReact={() => setHasIntentToReact(true)}
          canReactDetails={canReactDetails}
        />
        <EmojiSummary
          context={reactionContext}
          reactionPreview={postFile.reactionPreview?.reactions}
          className="ml-2"
        />
        <div className="ml-auto flex flex-row items-center gap-2 font-semibold">
          {isPublic ? <ShareButton permalink={permalink} /> : null}
          {isOwner && isPublic ? <RepostButton postFile={postFile} permalink={permalink} /> : null}
          <button
            className={`inline-flex items-center hover:text-black dark:hover:text-white ${
              !toggleable ? 'pointer-events-none' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              if (toggleable) setIsExpanded(!isExpanded);
            }}
          >
            <Bubble className="inline-block h-6 w-6" />
            <span className="sr-only">{t('Toggle comments')}</span>
          </button>
          <CommentSummary
            context={reactionContext}
            reactionPreview={postFile.reactionPreview?.comments}
            onToggle={() => {
              if (toggleable) setIsExpanded(!isExpanded);
            }}
          />
        </div>
      </div>
      {isExpanded ? (
        <div
          className="grid cursor-default grid-flow-row gap-2  pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <hr className="mb-4 dark:border-t-gray-300 dark:border-opacity-20" />
          <Suspense fallback={null}>
            <CommentList context={reactionContext} canReactDetails={canReactDetails} />
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

export const ShareButton = ({ permalink }: { permalink: string }) => {
  if (!navigator.share) return null;

  return (
    <button
      className="inline-flex items-center hover:text-black dark:hover:text-white"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.share({ url: permalink });
      }}
    >
      <Share className="inline-block h-6 w-6" />
      <span className="sr-only">{t('Share')}</span>
    </button>
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
          embeddedPost={{ ...postFile.content, permalink }}
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
    <>
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
    </>
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
  const { data: totalCount } = useCommentSummary({ ...context, reactionPreview }).fetch;
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
  if (!reactionPreview?.comments.length) {
    return null;
  }

  const allEncrypted = reactionPreview.comments.every((comment) => comment.payloadIsEncrypted);

  return (
    <div className="mb-5">
      <hr className="mb-4 dark:border-t-gray-300 dark:border-opacity-20"></hr>

      <div className="flex cursor-pointer flex-col gap-[0.2rem]" onClick={() => onExpand()}>
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
  canReactDetails,
}: {
  context: ReactionContext;
  canReactDetails: CanReactDetails;
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
          canReactDetails={canReactDetails}
          commentData={comment}
          key={comment.id ?? index}
          isThread={false}
        />
      ))}
      <CommentComposer context={context} canReactDetails={canReactDetails} />
    </>
  );
};
