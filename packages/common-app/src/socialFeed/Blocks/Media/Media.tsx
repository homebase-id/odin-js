import { PostContent, Media } from '@youfoundation/js-lib/public';
import { MediaGallery, PrimaryMedia } from '@youfoundation/common-app';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';

export const PostMedia = ({
  odinId,
  postFile,
  postPath,
  showFallback,
  forceAspectRatio,
  onClick,
  className,
}: {
  odinId?: string;
  postFile: {
    content: PostContent;
    previewThumbnail?: EmbeddedThumb;
    payloadIsEncrypted?: boolean;
  };
  postPath: string;
  showFallback?: boolean;
  forceAspectRatio?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => void;
  className?: string;
}) => {
  const { content: post, previewThumbnail } = postFile;
  const mediaFileIds = (post as Media).mediaFiles;

  if (!post.primaryMediaFile) {
    if (showFallback) {
      return (
        <div
          className={`${
            className || ''
          } relative aspect-square overflow-hidden bg-slate-50 text-slate-200 dark:bg-slate-700 dark:text-slate-600`}
        >
          <p className="absolute inset-0 p-2 text-9xl">{post.caption}</p>
        </div>
      );
    }
    return <div className={`${className || ''}`}></div>;
  }

  if (mediaFileIds && mediaFileIds.length > 1) {
    return (
      <MediaGallery
        odinId={odinId}
        channelId={post.channelId}
        files={mediaFileIds}
        className={`${className || ''}`}
        postUrl={postPath}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postFile.payloadIsEncrypted}
        onClick={onClick}
      />
    );
  }
  return (
    <div className={`relative ${className || ''}`}>
      <PrimaryMedia
        post={post}
        odinId={odinId}
        className={`w-full ${forceAspectRatio ? 'md:aspect-square ' : ''} `}
        postUrl={postPath}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postFile.payloadIsEncrypted}
        fit="cover"
        onClick={onClick ? (e) => onClick(e, 0) : undefined}
      />
    </div>
  );
};
