import { getChannelDrive, POST_LINKS_PAYLOAD_KEY } from '@homebase-id/js-lib/public';
import {
  EmbeddedThumb,
  NewPayloadDescriptor,
  PayloadDescriptor,
  SystemFileType,
  TargetDrive,
} from '@homebase-id/js-lib/core';
import { Image } from '../../../media/Image';
import { Video, VideoClickToLoad } from '../../../media/Video';
import { ExtensionThumbnail } from '../../../form/files/ExtensionThumbnail';
import { useFile } from '../../../hooks';
import { Download } from '../../../ui/Icons';
import { bytesToSize, t } from '../../../helpers';
import { LinkPreviewItem } from '../../../media/Link';
import { useEffect } from 'react';
import { PDFHandler } from '../../../media/PdfHandler';

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

  const isVideo =
    file.contentType?.startsWith('video') ||
    file.contentType?.startsWith('application/vnd.apple.mpegurl');
  // const isAudio = file.contentType?.startsWith('audio');
  const isImage = file.contentType?.startsWith('image');
  const isLink = file.key === POST_LINKS_PAYLOAD_KEY;

  return (
    <div onClick={doNavigate}>
      {isImage ? (
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
      ) : isVideo ? (
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
      ) : isLink ? (
        <LinkPreviewItem
          odinId={odinId}
          globalTransitId={globalTransitId}
          targetDrive={getChannelDrive(channelId)}
          fileId={fileId}
          payload={file as PayloadDescriptor}
          className="mx-2 mt-2 border rounded-t-lg"
        />
      ) : (
        <BoringFile
          odinId={odinId}
          targetDrive={getChannelDrive(channelId)}
          fileId={fileId}
          globalTransitId={globalTransitId}
          file={file}
          className="aspect-video"
        />
      )}
    </div>
  );
};

interface BaseBoringFileProps {
  systemFileType?: SystemFileType;
  file: PayloadDescriptor | NewPayloadDescriptor;
  canDownload?: boolean;
  className?: string;
  onLoad?: () => void;
  isLegacy?: boolean;
  isPreview?: boolean;
}

interface BoringFilePayloadProps extends BaseBoringFileProps {
  odinId: string | undefined;
  globalTransitId: string | undefined;
  fileId: string;
  targetDrive: TargetDrive;
  file: PayloadDescriptor;
}

interface BoringFileNewPayloadProps extends Omit<Partial<BoringFilePayloadProps>, 'file'> {
  file: NewPayloadDescriptor;
}

type BoringFileProps = BoringFilePayloadProps | BoringFileNewPayloadProps;

export const BoringFile = ({
  odinId,
  fileId,
  globalTransitId,
  targetDrive,
  systemFileType,
  file,
  canDownload,
  className,
  onLoad,
  isLegacy,
  isPreview,
}: BoringFileProps) => {
  const contentType =
    (file as NewPayloadDescriptor)?.pendingFile?.type ||
    file.contentType ||
    'application/octet-stream';
  const byteSize = (file as NewPayloadDescriptor)?.pendingFile?.size || file.bytesWritten || 0;

  const fetchFileFromServer = useFile(targetDrive && { targetDrive, systemFileType }).fetchFile;

  const fetchFile = (file as NewPayloadDescriptor)?.pendingFileUrl
    ? () => (file as NewPayloadDescriptor).pendingFileUrl as string
    : async () =>
        (fileId &&
          (await fetchFileFromServer(odinId, globalTransitId, fileId, file.key as string))) ||
        '';

  const doDownload = (url: string) => {
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = file.descriptorContent || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  if (!file) return null;

  // Legacy preview-style UI (large square tile with centered icon/text)
  if (isLegacy) {
    return (
      <ExtensionFile
        contentType={contentType}
        fileName={
          ((file as NewPayloadDescriptor)?.pendingFile as File)?.name ||
          file.descriptorContent ||
          contentType
        }
        byteSize={byteSize}
        canDownload={canDownload}
        className={className}
        onDownload={
          canDownload
            ? async () => {
                doDownload(await fetchFile());
              }
            : undefined
        }
      />
    );
  }

  if (isPreview) {
    if (contentType.includes('pdf')) {
      const previewName =
        ((file as NewPayloadDescriptor)?.pendingFile as File)?.name ||
        file.descriptorContent ||
        'Document.pdf';
      const fetchPdfUrl = async () => await fetchFile();
      return <PDFHandler fetchFile={fetchPdfUrl} className={className} fileName={previewName} />;
    }
    return (
      <ExtensionFile
        contentType={contentType}
        fileName={
          ((file as NewPayloadDescriptor)?.pendingFile as File)?.name ||
          file.descriptorContent ||
          contentType
        }
        byteSize={byteSize}
        canDownload={canDownload}
        className={className}
        onDownload={
          canDownload
            ? async () => {
                doDownload(await fetchFile());
              }
            : undefined
        }
      />
    );
  }

  // New chat-style compact row UI (like WhatsApp/Telegram)
  const fileName =
    ((file as NewPayloadDescriptor)?.pendingFile as File)?.name ||
    file.descriptorContent ||
    file.key ||
    contentType;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-foreground ${className || ''}`}
      onClick={
        canDownload
          ? async () => {
              doDownload(await fetchFile());
            }
          : undefined
      }
      role={canDownload !== false ? 'button' : undefined}
    >
      <ExtensionThumbnail contentType={contentType} className="h-10 w-10 text-foreground/60" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{fileName}</div>
        <div className="text-xs text-muted-foreground">{bytesToSize(byteSize)}</div>
      </div>
      {canDownload !== false ? (
        <button
          type="button"
          data-action="download"
          onClick={async (e) => {
            e.stopPropagation();
            doDownload(await fetchFile());
          }}
          className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm hover:bg-muted"
          aria-label={t('Download')}
        >
          <Download className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

// A tile-style file renderer with large centered icon and optional big download overlay
export const ExtensionFile = ({
  contentType,
  fileName,
  byteSize,
  canDownload,
  className,
  onDownload,
}: {
  contentType: string;
  fileName: string;
  byteSize: number;
  canDownload?: boolean;
  className?: string;
  onDownload?: () => void | Promise<void>;
}) => {
  return (
    <div
      onClick={canDownload ? onDownload : undefined}
      className={`${className || ''} relative ${className?.indexOf('aspect-') ? '' : 'aspect-square'} overflow-hidden bg-slate-50 text-slate-200 dark:bg-slate-700 dark:text-slate-600 mx-auto ${canDownload ? 'cursor-pointer' : ''}`}
    >
      <p className="absolute inset-0 p-2 text-9xl break-all">{fileName}</p>
      <div className="absolute inset-0 flex gap-3 items-center justify-center text-foreground">
        <ExtensionThumbnail
          contentType={contentType}
          className={`${canDownload ? 'h-64 w-64 text-slate-200 dark:text-slate-600' : 'h-32 w-32 text-slate-500 dark:text-slate-400'}`}
        />
      </div>

      {canDownload ? (
        <div className="absolute inset-0 flex gap-3 items-center justify-center text-foreground">
          <span className="flex flex-col items-center">
            <Download className="h-12 w-12 " /> {t('Download')} ({bytesToSize(byteSize)})
          </span>
        </div>
      ) : null}
    </div>
  );
};
