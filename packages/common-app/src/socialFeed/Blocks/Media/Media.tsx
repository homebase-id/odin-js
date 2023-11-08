import { PostContent, Media } from '@youfoundation/js-lib/public';
import { MediaGallery, PrimaryMedia } from '@youfoundation/common-app';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';

export const PostMedia = ({
  odinId,
  postFile,
  showFallback,
  forceAspectRatio,
  onClick,
  className,
}: {
  odinId?: string;
  postFile: {
    fileId: string;
    globalTransitId?: string;
    content: PostContent;
    previewThumbnail?: EmbeddedThumb;
    isEncrypted?: boolean;
  };
  showFallback?: boolean;
  forceAspectRatio?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => void;
  className?: string;
}) => {
  const { content: post, previewThumbnail } = postFile;
  const mediaFiles = (post as Media).mediaFiles;
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
        fileId={postFile.fileId}
        globalTransitId={postFile.globalTransitId}
        channelId={post.channelId}
        files={mediaFiles}
        className={`${className || ''}`}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postFile.isEncrypted}
        onClick={onClick}
      />
    );

  return (
    <div className={`relative ${className || ''}`}>
      <PrimaryMedia
        fit="contain"
        primaryMediaFile={post.primaryMediaFile}
        channelId={post.channelId}
        fileId={postFile.fileId}
        globalTransitId={postFile.globalTransitId}
        odinId={odinId}
        className={`w-full max-h-[70vh] ${forceAspectRatio ? 'md:aspect-square ' : ''} `}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postFile.isEncrypted}
        onClick={onClick ? (e) => onClick(e, 0) : undefined}
        clickToLoad={true}
      />
    </div>
  );
};
