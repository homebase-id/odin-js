import { PostContent, Media, PostFile } from '@youfoundation/js-lib';
import { MediaGallery, PrimaryMedia } from '@youfoundation/common-app';

export const PostMedia = ({
  odinId,
  postFile,
  postPath,
  showFallback,
  forceAspectRatio,
}: {
  odinId?: string;
  postFile: PostFile<PostContent>;
  postPath: string;
  showFallback?: boolean;
  forceAspectRatio?: boolean;
}) => {
  const { content: post, previewThumbnail } = postFile;
  const mediaFileIds = (post as Media).mediaFiles;

  if (!post.primaryMediaFile) {
    if (showFallback) {
      return (
        <div
          className={`relative mb-4 aspect-square overflow-hidden bg-slate-50 text-slate-200 dark:bg-slate-700 dark:text-slate-600`}
        >
          <p className="absolute inset-0 p-2 text-9xl">{post.caption}</p>
        </div>
      );
    }
    return <div className="mb-4"></div>;
  }

  if (mediaFileIds && mediaFileIds.length > 1) {
    return (
      <MediaGallery
        odinId={odinId}
        channelId={post.channelId}
        files={mediaFileIds}
        className="mb-4"
        postUrl={postPath}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postFile.payloadIsEncrypted}
      />
    );
  }
  return (
    <div className={`relative mb-4`}>
      <PrimaryMedia
        post={post}
        odinId={odinId}
        className={`
              w-full
            ${forceAspectRatio ? 'md:aspect-square ' : ''}
            `}
        postUrl={postPath}
        previewThumbnail={previewThumbnail}
        probablyEncrypted={postFile.payloadIsEncrypted}
        fit="cover"
      />
    </div>
  );
};
