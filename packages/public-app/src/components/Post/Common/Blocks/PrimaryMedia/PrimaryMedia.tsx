import { EmbeddedThumb, getChannelDrive, PostContent } from '@youfoundation/js-lib';
import Image from '../../../../Image/Image';
import { useNavigate } from 'react-router-dom';
import Video from '../../../../Video/Video';

const PrimaryMedia = ({
  odinId,
  post,
  className,
  fit,
  postUrl,
  previewThumbnail,
  probablyEncrypted,
}: {
  odinId?: string;
  post: PostContent;
  className?: string;
  fit?: 'cover' | 'contain';
  postUrl: string;
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
}) => {
  const navigate = useNavigate();
  // Don't navigate when it's an article, as the image is likely a teaser
  const clickable = post.type !== 'Article';
  const isDesktop = document.documentElement.clientWidth >= 1024;

  const doNavigate = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    const targetUrl = `${postUrl}/${0}`;
    if (targetUrl.startsWith('http')) {
      window.location.href = targetUrl;
    } else {
      navigate(targetUrl);
    }
    return false;
  };

  return (
    <div
      onClick={clickable && isDesktop ? doNavigate : undefined}
      className={clickable && isDesktop ? 'cursor-pointer' : ''}
    >
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
        />
      )}
    </div>
  );
};

export default PrimaryMedia;
