import { PostContent } from '@youfoundation/js-lib/public';
import { DEFAULT_PAYLOAD_KEY, EmbeddedThumb, PayloadDescriptor } from '@youfoundation/js-lib/core';
import { MediaGallery } from './MediaGallery';
import { PrimaryMedia } from './PrimaryMedia';

export const PostMedia = ({
  odinId,
  postInfo,
  showFallback,
  forceAspectRatio,
  onClick,
  className,
}: {
  odinId?: string;
  postInfo: {
    fileId: string;
    globalTransitId?: string;
    lastModified: number | undefined;
    content: PostContent;
    previewThumbnail?: EmbeddedThumb;
    isEncrypted?: boolean;
    payloads?: PayloadDescriptor[];
  };
  showFallback?: boolean;
  forceAspectRatio?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => void;
  className?: string;
}) => {
  const { content: post, previewThumbnail } = postInfo;

  const mediaFiles =
    postInfo?.content.type !== 'Article'
      ? postInfo?.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY) || []
      : [];

  // const mediaFiles = (post as Media).mediaFiles;
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

  if (mediaFiles && mediaFiles.length > 1)
    return (
      <MediaGallery
        odinId={odinId}
        fileId={postInfo.fileId}
        globalTransitId={postInfo.globalTransitId}
        lastModified={postInfo.lastModified}
        channelId={post.channelId}
        files={mediaFiles}
        className={`${className || ''}`}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postInfo.isEncrypted}
        onClick={onClick}
      />
    );

  return (
    <div className={`relative ${className || ''}`}>
      <PrimaryMedia
        fit="contain"
        primaryMediaFile={post.primaryMediaFile}
        channelId={post.channelId}
        fileId={postInfo.fileId}
        globalTransitId={postInfo.globalTransitId}
        lastModified={postInfo.lastModified}
        odinId={odinId}
        className={`w-full max-h-[80vh] ${forceAspectRatio ? 'md:aspect-square ' : ''} `}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postInfo.isEncrypted}
        onClick={onClick ? (e) => onClick(e, 0) : undefined}
        clickToLoad={true}
      />
    </div>
  );
};
