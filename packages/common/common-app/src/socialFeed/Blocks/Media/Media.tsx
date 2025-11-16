import { POST_FULL_TEXT_PAYLOAD_KEY, PostContent } from '@homebase-id/js-lib/public';
import {
  DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
  DEFAULT_PAYLOAD_KEY,
  EmbeddedThumb,
  PayloadDescriptor,
} from '@homebase-id/js-lib/core';
import { MediaGallery } from './MediaGallery';
import { PrimaryMedia } from './PrimaryMedia';

const EXCLUDE_PAYLOAD_KEYS = [
  DEFAULT_PAYLOAD_KEY,
  DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
  POST_FULL_TEXT_PAYLOAD_KEY,
];

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

  // Fo articles we only want the primary media file
  const mediaFiles =
    postInfo?.content.type !== 'Article'
      ? postInfo?.payloads?.filter((p) => !EXCLUDE_PAYLOAD_KEYS.includes(p.key))
      : postInfo?.payloads?.filter((p) => p.key === postInfo.content.primaryMediaFile?.fileKey);

  if (!post.primaryMediaFile) {
    if (showFallback) {
      return (
        <div
          onClick={onClick ? (e) => onClick(e, 0) : undefined}
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

  if (!mediaFiles || mediaFiles.length === 0) return null;

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
        file={mediaFiles[0]}
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
