import { getChannelDrive, PostContent } from '@youfoundation/js-lib/public';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { Image, Video } from '@youfoundation/common-app';

export const PrimaryMedia = ({
  odinId,
  post,
  className,
  fit,
  previewThumbnail,
  probablyEncrypted,
  onClick,
}: {
  odinId?: string;
  post: PostContent;
  className?: string;
  fit?: 'cover' | 'contain';
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
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
          className={className}
          previewThumbnail={previewThumbnail}
          fit={fit}
          probablyEncrypted={probablyEncrypted}
        />
      ) : (
        <Video
          odinId={odinId}
          targetDrive={getChannelDrive(post.channelId)}
          fileId={post.primaryMediaFile?.fileId}
          className={className}
          probablyEncrypted={probablyEncrypted}
          previewThumbnail={previewThumbnail}
        />
      )}
    </div>
  );
};
