import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmbeddedThumb, HomebaseFile, ImageSize } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../../../providers/ChatProvider';
import {
  ActionButton,
  BoringFile,
  usePortal,
  useDotYouClientContext,
  OdinVideoWrapper,
} from '@homebase-id/common-app';
import { Arrow, ArrowLeft, Times } from '@homebase-id/common-app/icons';
import { ChatDrive } from '../../../../providers/ConversationProvider';
import { ImageSource, OdinPayloadImage, OdinPreviewImage } from '@homebase-id/ui-lib';
import { useNavigate, useParams } from 'react-router-dom';

export const ChatMediaGallery = ({ msg }: { msg: HomebaseFile<ChatMessage> }) => {
  const target = usePortal('modal-container');

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

  const allkeys = msg.fileMetadata.payloads?.map((p) => p.key);
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
  const dialog = (
    <div className="fixed inset-0 z-40 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-[100dvh] flex-row items-center justify-center">
          {contentType?.startsWith('video') || contentType === 'application/vnd.apple.mpegurl' ? (
            <OdinVideoWrapper
              autoPlay={true}
              fileId={msg.fileId}
              fileKey={mediaKey}
              key={mediaKey}
              targetDrive={ChatDrive}
              lastModified={msg.fileMetadata.updated}
              probablyEncrypted={true}
              className="h-full max-h-[100dvh] w-full object-contain"
            />
          ) : contentType?.startsWith('image') ? (
            <CustomOdinImage
              className={`m-auto h-auto max-h-[100dvh] w-auto max-w-full object-contain`}
              fileId={msg.fileId}
              fileKey={mediaKey}
              key={mediaKey}
              targetDrive={ChatDrive}
              lastModified={msg.fileMetadata.updated}
            />
          ) : payload ? (
            <BoringFile
              odinId={undefined}
              globalTransitId={undefined}
              targetDrive={ChatDrive}
              fileId={msg.fileId}
              file={payload}
              canDownload={true}
              className="h-full min-h-[inherit] w-full"
            />
          ) : null}

          {onClose ? (
            <button
              onClick={onClose}
              className={`absolute left-4 top-4 rounded-full border border-primary/50 bg-background p-3 text-foreground hover:brightness-90 hover:filter dark:border-primary/50`}
            >
              <Times className="h-5 w-5" />
            </button>
          ) : null}

          {prevKey ? (
            <ActionButton
              icon={ArrowLeft}
              onClick={(e) => goPrev(e.nativeEvent)}
              className="absolute left-2 top-[calc(50%-1.25rem)] rounded-full p-3"
              size="square"
              type="secondary"
            />
          ) : null}
          {nextKey ? (
            <ActionButton
              icon={Arrow}
              onClick={(e) => goNext(e.nativeEvent)}
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
  ...props
}: { className?: string; previewThumbnail?: EmbeddedThumb } & ImageSource) => {
  const dotYouClient = useDotYouClientContext();
  const [tinyLoaded, setTinyLoaded] = useState(false);
  const [finalLoaded, setFinalLoaded] = useState(false);

  const [naturalSize, setNaturalSize] = useState<ImageSize | undefined>(props.previewThumbnail);

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
