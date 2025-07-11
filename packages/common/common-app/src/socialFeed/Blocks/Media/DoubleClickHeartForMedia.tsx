import { HomebaseFile } from '@homebase-id/js-lib/core';
import { PostContent, ReactionContext } from '@homebase-id/js-lib/public';
import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useReaction, useDoubleTap, useDotYouClientContext } from '../../../hooks';
import { ErrorNotification } from '../../../ui';
import { PostMedia } from './Media';

export const DoubleClickHeartForMedia = ({
  odinId,
  postFile,
  showFallback,
  forceAspectRatio,
  onClick,
  className,
}: {
  odinId?: string;
  postFile: HomebaseFile<PostContent>;
  showFallback?: boolean;
  forceAspectRatio?: boolean;
  onClick: ((e: React.MouseEvent, index: number) => void) | undefined;
  className?: string;
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const { mutateAsync: postEmoji, error: postEmojiError } = useReaction().saveEmoji;
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

  const postContent = postFile.fileMetadata.appData.content;
  const reactionContext: ReactionContext = {
    odinId: odinId || window.location.hostname,
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
        authorOdinId: loggedOnIdentity,
      },
      context: reactionContext,
    });
  };

  const bind = useDoubleTap<HTMLElement>(() => doLike(), undefined, {
    onSingleTap: (event, index) => {
      if (onClick) onClick(event, index as number);
    },
  });

  const previewThumbnail = useMemo(() => {
    if (postFile.fileMetadata.appData.content.type === 'Article') {
      const primaryKey = postFile.fileMetadata.appData.content.primaryMediaFile?.fileKey;
      return postFile.fileMetadata.payloads?.find((payload) => payload.key === primaryKey)
        ?.previewThumbnail;
    }
    return postFile.fileMetadata.appData.previewThumbnail;
  }, [postFile]);

  return (
    <span ref={wrapperRef} onClick={(e) => e.stopPropagation()} data-thumb={!!previewThumbnail}>
      {postFile.fileId ? (
        <PostMedia
          odinId={odinId}
          postInfo={{
            fileId: postFile.fileId,
            dataSource: postFile.fileMetadata.dataSource,
            globalTransitId: postFile.fileMetadata.globalTransitId,
            lastModified: postFile.fileMetadata.updated,
            previewThumbnail: previewThumbnail,
            isEncrypted: postFile.fileMetadata.isEncrypted,
            content: postContent,
            payloads: postFile.fileMetadata.payloads,
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
