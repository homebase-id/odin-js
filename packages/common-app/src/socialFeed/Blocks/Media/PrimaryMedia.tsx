import { getChannelDrive, MediaFile } from '@youfoundation/js-lib/public';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { Image, Video, VideoClickToLoad } from '@youfoundation/common-app';

export const PrimaryMedia = ({
  odinId,
  primaryMediaFile,
  fileId,
  globalTransitId,
  channelId,
  className,
  fit,
  previewThumbnail,
  probablyEncrypted,
  onClick,
  clickToLoad,
}: {
  odinId?: string;
  primaryMediaFile: MediaFile;
  fileId: string;
  globalTransitId?: string;
  channelId: string;
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
      {primaryMediaFile?.type === 'image' ? (
        <Image
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={primaryMediaFile?.fileId || fileId}
          globalTransitId={globalTransitId}
          fileKey={primaryMediaFile?.fileKey}
          className={className}
          previewThumbnail={previewThumbnail}
          fit={fit}
          probablyEncrypted={probablyEncrypted}
        />
      ) : clickToLoad ? (
        <VideoClickToLoad
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={primaryMediaFile?.fileId || fileId}
          globalTransitId={globalTransitId}
          fileKey={primaryMediaFile?.fileKey}
          className={className}
          probablyEncrypted={probablyEncrypted}
          previewThumbnail={previewThumbnail}
          preload={false}
          fit="contain"
        />
      ) : (
        <Video
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={primaryMediaFile?.fileId || fileId}
          globalTransitId={globalTransitId}
          fileKey={primaryMediaFile?.fileKey}
          className={className}
          probablyEncrypted={probablyEncrypted}
        />
      )}
    </div>
  );
};
