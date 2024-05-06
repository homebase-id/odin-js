import { getChannelDrive } from '@youfoundation/js-lib/public';
import { EmbeddedThumb, PayloadDescriptor, TargetDrive } from '@youfoundation/js-lib/core';
import { Image } from '../../../media/Image';
import { Video, VideoClickToLoad } from '../../../media/Video';
import { ExtensionThumbnail } from '../../../form/files/ExtensionThumbnail';
import { useFile } from '../../../hooks';
import { Download } from '../../../ui';
import { t } from '../../../helpers';

export const PrimaryMedia = ({
  odinId,
  file,
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
  file: PayloadDescriptor;
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

  return (
    <div onClick={doNavigate}>
      {file?.contentType.startsWith('image') ? (
        <Image
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={fileId}
          globalTransitId={globalTransitId}
          lastModified={lastModified}
          fileKey={file.key}
          className={className}
          previewThumbnail={previewThumbnail}
          fit={fit}
          probablyEncrypted={probablyEncrypted}
        />
      ) : file?.contentType.startsWith('video') ? (
        <>
          {clickToLoad ? (
            <VideoClickToLoad
              odinId={odinId}
              targetDrive={getChannelDrive(channelId)}
              fileId={fileId}
              globalTransitId={globalTransitId}
              lastModified={lastModified}
              fileKey={file.key}
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
              fileId={fileId}
              globalTransitId={globalTransitId}
              lastModified={lastModified}
              fileKey={file.key}
              className={className}
              probablyEncrypted={probablyEncrypted}
            />
          )}
        </>
      ) : (
        <BoringFile
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={fileId}
          file={file}
        />
      )}
    </div>
  );
};

export const BoringFile = ({
  odinId,
  targetDrive,
  fileId,
  file,
  canDownload,
  className,
}: {
  odinId: string | undefined;
  targetDrive: TargetDrive;
  fileId: string;
  file: PayloadDescriptor;
  canDownload?: boolean;
  className?: string;
}) => {
  const fetchFile = useFile({ targetDrive }).fetchFile;
  const doDownload = (url: string) => {
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = file.descriptorContent || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return (
    <div
      onClick={
        canDownload
          ? async () => {
              doDownload((await fetchFile(odinId, fileId, file.key)) || '');
            }
          : undefined
      }
      className={`${className || ''} relative aspect-square overflow-hidden bg-slate-50 text-slate-200 dark:bg-slate-700 dark:text-slate-600 mx-auto ${canDownload ? 'cursor-pointer' : ''}`}
    >
      <p className="absolute inset-0 p-2 text-9xl break-all">
        {file.descriptorContent || file.contentType}
      </p>
      <div className="absolute inset-0 flex gap-3 items-center justify-center text-foreground">
        <ExtensionThumbnail
          contentType={file.contentType}
          className={`${canDownload ? 'h-64 w-64 text-slate-200 dark:text-slate-600' : 'h-32 w-32 text-slate-500 dark:text-slate-400'}`}
        />
      </div>

      {canDownload ? (
        <div className="absolute inset-0 flex gap-3 items-center justify-center text-foreground">
          <span className="flex flex-col items-center">
            <Download className="h-12 w-12 " /> {t('Download')}
          </span>
        </div>
      ) : null}
    </div>
  );
};
