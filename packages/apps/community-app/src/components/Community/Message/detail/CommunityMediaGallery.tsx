import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
  DEFAULT_PAYLOAD_KEY,
  EmbeddedThumb,
  HomebaseFile,
  ImageSize,
} from '@homebase-id/js-lib/core';
import {
  ActionButton,
  BoringFile,
  VideoClickToLoad,
  usePortal,
  useDotYouClientContext,
  useFile,
  bytesToSize,
} from '@homebase-id/common-app';
import { ImageSource, OdinPayloadImage, OdinPreviewImage } from '@homebase-id/ui-lib';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BACKEDUP_PAYLOAD_KEY,
  CommunityMessage,
} from '../../../../providers/CommunityMessageProvider';
import { getTargetDriveFromCommunityId } from '../../../../providers/CommunityDefinitionProvider';
import { Times, ArrowLeft, Arrow, Download } from '@homebase-id/common-app/icons';

export const CommunityMediaGallery = ({
  odinId,
  communityId,
  msg,
}: {
  odinId: string;
  communityId: string;
  msg: HomebaseFile<CommunityMessage>;
}) => {
  const target = usePortal('modal-container');

  const targetDrive = getTargetDriveFromCommunityId(communityId);

  const navigate = useNavigate();
  const { mediaKey } = useParams();

  if (!mediaKey) return null;

  const paths = window.location.pathname.split('/');
  const onClose = () => {
    const toPaths = [...paths];
    toPaths.pop();
    toPaths.pop();
    navigate(toPaths.join('/'));
  };

  const allkeys = msg.fileMetadata.payloads
    ?.filter(
      (pyld) =>
        pyld.key !== DEFAULT_PAYLOAD_KEY &&
        pyld.key !== BACKEDUP_PAYLOAD_KEY &&
        !pyld.key.includes(DEFAULT_PAYLOAD_DESCRIPTOR_KEY)
    )
    ?.map((p) => p.key);
  const nextKey = allkeys?.[allkeys.indexOf(mediaKey) + 1];
  const prevKey = allkeys?.[allkeys.indexOf(mediaKey) - 1];

  const goNext = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();

    if (nextKey) {
      const toPaths = [...paths];
      toPaths.pop();
      navigate([...toPaths, nextKey].join('/'));
    }
  };

  const goPrev = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();

    if (prevKey) {
      const toPaths = [...paths];
      toPaths.pop();
      navigate([...toPaths, prevKey].join('/'));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();

        goPrev(e);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();

        goNext(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();

        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [msg, mediaKey]);

  const payload = msg.fileMetadata.payloads?.find((p) => p.key === mediaKey);
  const contentType = payload?.contentType;

  const fileName =
    (payload?.contentType !== 'application/vnd.apple.mpegurl' &&
      payload?.contentType !== 'video/mp2t' &&
      payload?.descriptorContent) ||
    payload?.key;

  const getFileUrl = useFile({ targetDrive, systemFileType: msg.fileSystemType }).fetchFile;
  const doDownload = async () => {
    const url = await getFileUrl(odinId, msg.fileMetadata.globalTransitId, msg.fileId, mediaKey);
    if (!url) return;
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  if (!payload) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-40 bg-slate-900 lg:bg-transparent"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="inset-0 bg-slate-900 transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-[100dvh] flex-row items-center justify-center">
          {contentType?.startsWith('video') || contentType === 'application/vnd.apple.mpegurl' ? (
            <VideoClickToLoad
              preload={true}
              odinId={odinId}
              fileId={msg.fileId}
              fileKey={mediaKey}
              targetDrive={targetDrive}
              systemFileType={msg.fileSystemType}
              previewThumbnail={payload?.previewThumbnail}
              lastModified={msg.fileMetadata.updated}
              probablyEncrypted={true}
              className="h-full max-h-[100dvh] w-full object-contain"
            />
          ) : contentType?.startsWith('image') ? (
            <CustomOdinImage
              className={`m-auto h-auto max-h-[100dvh] w-auto max-w-full object-contain`}
              odinId={odinId}
              fileId={msg.fileId}
              fileKey={mediaKey}
              previewThumbnail={payload?.previewThumbnail}
              targetDrive={targetDrive}
              systemFileType={msg.fileSystemType}
              lastModified={msg.fileMetadata.updated}
            />
          ) : payload ? (
            <BoringFile
              odinId={odinId}
              targetDrive={targetDrive}
              systemFileType={msg.fileSystemType}
              fileId={msg.fileId}
              globalTransitId={msg.fileMetadata.globalTransitId}
              file={payload}
              canDownload={true}
              className="h-full min-h-[inherit] w-full"
            />
          ) : null}

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 right-0 top-0 flex w-full flex-row flex-wrap px-3 py-3 text-white"
          >
            <div className="flex flex-row items-center gap-2">
              {onClose ? (
                <ActionButton
                  icon={Times}
                  onClick={onClose}
                  className="rounded-full p-3"
                  size="square"
                  type="secondary"
                />
              ) : null}
            </div>
            <div className="ml-auto flex flex-row items-center gap-2">
              <p className="text-sm text-slate-400">{bytesToSize(payload.bytesWritten)}</p>

              <ActionButton
                icon={Download}
                onClick={doDownload}
                className="rounded-full p-3"
                size="square"
                type="secondary"
              />
            </div>
          </div>

          {prevKey ? (
            <ActionButton
              icon={ArrowLeft}
              onClick={(e) => {
                goPrev(e.nativeEvent);
                e.stopPropagation();
              }}
              className="absolute left-2 top-[calc(50%-1.25rem)] rounded-full p-3"
              size="square"
              type="secondary"
            />
          ) : null}
          {nextKey ? (
            <ActionButton
              icon={Arrow}
              onClick={(e) => {
                goNext(e.nativeEvent);
                e.stopPropagation();
              }}
              className="absolute right-2 top-[calc(50%-1.25rem)] rounded-full p-3"
              size="square"
              type="secondary"
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};

const CustomOdinImage = ({
  className,
  previewThumbnail,
  ...props
}: { className?: string; previewThumbnail?: EmbeddedThumb } & ImageSource) => {
  const dotYouClient = useDotYouClientContext();
  const [tinyLoaded, setTinyLoaded] = useState(false);
  const [finalLoaded, setFinalLoaded] = useState(false);

  const [naturalSize, setNaturalSize] = useState<ImageSize | undefined>(previewThumbnail);

  return (
    <div
      className={`relative h-full w-full ${className || ''}`}
      style={
        naturalSize?.pixelWidth && naturalSize?.pixelHeight
          ? {
              aspectRatio: `${naturalSize?.pixelWidth}/${naturalSize?.pixelHeight}`,
              maxWidth: `${naturalSize.pixelWidth}px`,
            }
          : undefined
      }
    >
      <OdinPreviewImage
        className={`absolute inset-0 h-full w-full max-w-none object-contain object-center transition-opacity delay-500 ${finalLoaded ? 'opacity-0' : 'opacity-100'}`}
        dotYouClient={dotYouClient}
        {...props}
        previewThumbnail={previewThumbnail}
        blur="auto"
        onLoad={(naturalSize: ImageSize | undefined) => {
          setTinyLoaded(true);
          setNaturalSize((oldVal) => naturalSize || oldVal);
        }}
        style={
          naturalSize?.pixelWidth && naturalSize?.pixelHeight
            ? {
                aspectRatio: `${naturalSize?.pixelWidth}/${naturalSize?.pixelHeight}`,
                maxWidth: `${naturalSize.pixelWidth}px`,
              }
            : undefined
        }
        key={'preview'}
      />
      {tinyLoaded ? (
        <OdinPayloadImage
          className={`absolute inset-0 h-full w-full max-w-none object-contain object-center transition-opacity duration-300 ${finalLoaded ? 'opacity-100' : 'opacity-0'}`}
          dotYouClient={dotYouClient}
          {...props}
          naturalSize={naturalSize}
          style={
            naturalSize?.pixelWidth && naturalSize?.pixelHeight
              ? { aspectRatio: `${naturalSize?.pixelWidth}/${naturalSize?.pixelHeight}` }
              : undefined
          }
          onLoad={() => setFinalLoaded(true)}
          key={'original'}
        />
      ) : null}
    </div>
  );
};
