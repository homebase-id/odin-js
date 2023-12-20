import {
  useReaction,
  useDotYouClient,
  PostMedia,
  ErrorNotification,
  useDoubleTap,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { PostContent, ReactionContext } from '@youfoundation/js-lib/public';
import React from 'react';
import { useRef } from 'react';

export const DoubleClickHeartForMedia = ({
  odinId,
  postFile,
  showFallback,
  forceAspectRatio,
  onClick,
  className,
}: {
  odinId?: string;
  postFile: DriveSearchResult<PostContent>;
  showFallback?: boolean;
  forceAspectRatio?: boolean;
  onClick: (e: React.MouseEvent, index: number) => void;
  className?: string;
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const { mutateAsync: postEmoji, error: postEmojiError } = useReaction().saveEmoji;
  const { getIdentity } = useDotYouClient();

  const postContent = postFile.fileMetadata.appData.content;
  const reactionContext: ReactionContext = {
    authorOdinId: odinId || window.location.hostname,
    channelId: postContent.channelId,
    target: {
      globalTransitId: postFile.fileMetadata.globalTransitId ?? 'unknown',
      fileId: postFile.fileId ?? 'unknown',
      isEncrypted: postFile.fileMetadata.isEncrypted || false,
    },
  };

  const doLike = () => {
    postEmoji({
      emojiData: {
        body: '❤️',
        authorOdinId: getIdentity() || '',
      },
      context: reactionContext,
    });
  };

  const bind = useDoubleTap<HTMLElement>(() => doLike(), undefined, {
    onSingleTap: (event, index) => {
      if (onClick) onClick(event, index as number);
    },
  });

  return (
    <span ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
      {postFile.fileId ? (
        <PostMedia
          odinId={odinId}
          postInfo={{
            fileId: postFile.fileId,
            globalTransitId: postFile.fileMetadata.globalTransitId,
            lastModified: postFile.fileMetadata.updated,
            previewThumbnail: postFile.fileMetadata.appData.previewThumbnail,
            isEncrypted: postFile.fileMetadata.isEncrypted,

            content: postContent,
          }}
          showFallback={showFallback}
          forceAspectRatio={forceAspectRatio}
          className={`cursor-pointer ${className || ''}`}
          {...bind}
        />
      ) : null}
      <ErrorNotification error={postEmojiError} />
    </span>
  );
};
