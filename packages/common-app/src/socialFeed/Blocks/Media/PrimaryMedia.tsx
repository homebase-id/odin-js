import { getChannelDrive, PrimaryMediaFile } from '@youfoundation/js-lib/public';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { Image, Video, VideoClickToLoad } from '@youfoundation/common-app';

export const PrimaryMedia = ({
  odinId,
  primaryMediaFile,
  fileId,
  globalTransitId,
  lastModified,
  channelId,
  className,
  fit,
  previewThumbnail,
  probablyEncrypted,
  onClick,
  clickToLoad,
}: {
  odinId?: string;
  primaryMediaFile: PrimaryMediaFile;
  fileId: string;
  globalTransitId?: string;
  lastModified: number | undefined;
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

  // If the primary media fileId is set, then the media isn't stored on the postFile itself
  const correctedGlobalTransitId = primaryMediaFile?.fileId ? undefined : globalTransitId;

  return (
    <div onClick={doNavigate}>
      {primaryMediaFile?.type.startsWith('image') ? (
        <Image
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={primaryMediaFile?.fileId || fileId}
          globalTransitId={correctedGlobalTransitId}
          lastModified={lastModified}
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
          globalTransitId={correctedGlobalTransitId}
          lastModified={lastModified}
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
          globalTransitId={correctedGlobalTransitId}
          lastModified={lastModified}
          fileKey={primaryMediaFile?.fileKey}
          className={className}
          probablyEncrypted={probablyEncrypted}
        />
      )}
    </div>
  );
};
