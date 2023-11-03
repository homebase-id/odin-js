import { getChannelDrive, PostContent } from '@youfoundation/js-lib/public';
import { DEFAULT_PAYLOAD_KEY, EmbeddedThumb } from '@youfoundation/js-lib/core';
import { Image, Video, VideoClickToLoad } from '@youfoundation/common-app';

export const PrimaryMedia = ({
  odinId,
  post,
  className,
  fit,
  previewThumbnail,
  probablyEncrypted,
  onClick,
  clickToLoad,
}: {
  odinId?: string;
  post: PostContent;
  className?: string;
  fit?: 'cover' | 'contain';
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  clickToLoad?: boolean;
}) => {
  const doNavigate = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    onClick && onClick(e);
  };

  return (
    <div onClick={doNavigate}>
      {post.primaryMediaFile?.type === 'image' ? (
        <Image
          odinId={odinId}
          targetDrive={getChannelDrive(post.channelId)}
          fileId={post.primaryMediaFile?.fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          className={className}
          previewThumbnail={previewThumbnail}
          fit={fit}
          probablyEncrypted={probablyEncrypted}
        />
      ) : clickToLoad ? (
        <VideoClickToLoad
          odinId={odinId}
          targetDrive={getChannelDrive(post.channelId)}
          fileId={post.primaryMediaFile?.fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          className={className}
          probablyEncrypted={probablyEncrypted}
          previewThumbnail={previewThumbnail}
          preload={false}
          fit="contain"
        />
      ) : (
        <Video
          odinId={odinId}
          targetDrive={getChannelDrive(post.channelId)}
          fileId={post.primaryMediaFile?.fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          className={className}
          probablyEncrypted={probablyEncrypted}
        />
      )}
    </div>
  );
};
