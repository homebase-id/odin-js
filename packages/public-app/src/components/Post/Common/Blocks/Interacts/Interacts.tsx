import { useState } from 'react';
import { t } from '../../../../../helpers/i18n/dictionary';
import Bubble from '../../../../ui/Icons/Bubble/Bubble';
import LikeButton from './Reactions/LikeButton/LikeButton';
import Comment, { CommentTeaser } from './Comments/Comment/Comment';
import {
  CommentsReactionSummary,
  PostContent,
  PostFile,
  ReactionContext,
  EmojiReactionSummary,
} from '@youfoundation/js-lib';
import CommentComposer from './Comments/CommentComposer/CommentComposer';
import ReactionDetailsDialog from '../../../../Dialog/ReactionDetailsDialog/ReactionDetailsDialog';
import useCanReact, { CanReactDetails } from '../../../../../hooks/reactions/useCanReact';
import useComments from '../../../../../hooks/reactions/comments/useComments';
import useCommentSummary from '../../../../../hooks/reactions/comments/useCommentSummary';
import useEmojiSummary from '../../../../../hooks/reactions/emojis/useEmojiSummary';

export const PostInteracts = ({
  authorOdinId,
  postFile,

  defaultExpanded,
  allowExpand = true,
  showSummary = false,
  className,
}: {
  authorOdinId: string;
  postFile: PostFile<PostContent>;

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
  });
  const canReactDetails = data?.canReact ? 'ALLOWED' : data?.details;

  if (canReactDetails) {
    console.log({ canReactDetails });
  }

  return (
    <div className={`${className ?? ''}`}>
      <div
        className={`mt-auto flex ${
          allowExpand ? 'cursor-default' : ''
        } items-center pb-4 text-sm text-foreground text-opacity-20 dark:text-opacity-30`}
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
        <div className="ml-auto flex flex-row items-center font-semibold">
          <button
            className={`inline-flex items-center hover:text-black dark:hover:text-white ${
              !toggleable ? 'pointer-events-none' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              if (toggleable) setIsExpanded(!isExpanded);
            }}
          >
            <Bubble className="mr-1 inline-block h-6 w-6" />
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
          <CommentList context={reactionContext} canReactDetails={canReactDetails} />
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

export const EmojiSummary = ({
  context,
  className,
  reactionPreview,
}: {
  context: ReactionContext;
  className?: string;
  reactionPreview?: EmojiReactionSummary;
}) => {
  const { data: reactionSummary } = useEmojiSummary({ context, reactionPreview }).fetch;
  const [isShowDetails, setIsShowDetails] = useState(false);

  return reactionSummary && reactionSummary.totalCount > 0 ? (
    <>
      <span
        className={`flex cursor-pointer flex-row items-center hover:text-button ${className ?? ''}`}
        onClick={() => setIsShowDetails(true)}
      >
        {reactionSummary.totalCount}
        <span className="ml-1 flex flex-row pr-1 text-foreground">
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
      <span className="block px-2">·</span>
      <button
        onClick={(e) => {
          if (onToggle) {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`${
          onToggle
            ? 'cursor-pointer text-button text-opacity-80 hover:text-button hover:underline'
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
        <button onClick={onExpand} className="text-sm font-bold text-button text-opacity-80">
          {`${!allEncrypted ? t('View all') : t('Decrypt all')} ${reactionPreview.totalCount} ${
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
          className="text-sm font-semibold text-foreground text-opacity-20 hover:underline dark:text-opacity-30"
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
