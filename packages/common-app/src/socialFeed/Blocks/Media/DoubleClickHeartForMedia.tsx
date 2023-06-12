import {
  useReaction,
  useDotYouClient,
  PostMedia,
  ErrorNotification,
  useDoubleTap,
} from '@youfoundation/common-app';
import { PostFile, PostContent, ReactionContext } from '@youfoundation/js-lib/public';
import React from 'react';
import { useRef } from 'react';

export const DoubleClickHeartForMedia = ({
  odinId,
  postFile,
  postPath,
  showFallback,
  forceAspectRatio,
  onClick,
}: {
  odinId?: string;
  postFile: PostFile<PostContent>;
  postPath: string;
  showFallback?: boolean;
  forceAspectRatio?: boolean;
  onClick: (e: React.MouseEvent, index: number) => void;
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const { mutateAsync: postEmoji, error: postEmojiError } = useReaction().saveEmoji;
  const { getIdentity } = useDotYouClient();

  const reactionContext: ReactionContext = {
    authorOdinId: odinId || window.location.hostname,
    channelId: postFile.content.channelId,
    target: {
      globalTransitId: postFile.globalTransitId ?? 'unknown',
      fileId: postFile.fileId ?? 'unknown',
      isEncrypted: postFile.payloadIsEncrypted || false,
    },
  };

  const doLike = () => {
    postEmoji({
      authorOdinId: getIdentity() || '',
      content: {
        body: '❤️',
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
    <span ref={wrapperRef}>
      <span onClick={(e) => e.stopPropagation()}>
        <PostMedia
          odinId={odinId}
          postFile={postFile}
          postPath={postPath}
          showFallback={showFallback}
          forceAspectRatio={forceAspectRatio}
          className="cursor-pointer"
          {...bind}
        />
        <ErrorNotification error={postEmojiError} />
      </span>
    </span>
  );
};
