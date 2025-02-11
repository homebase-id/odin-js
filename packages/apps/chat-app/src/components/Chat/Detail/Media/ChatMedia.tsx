import {
  HomebaseFile,
  EmbeddedThumb,
  PayloadDescriptor,
  NewHomebaseFile,
  NewPayloadDescriptor,
  DEFAULT_PAYLOAD_KEY,
} from '@homebase-id/js-lib/core';
import { OdinImage, OdinThumbnailImage, OdinAudio, OdinAudioWaveForm } from '@homebase-id/ui-lib';
import { CHAT_LINKS_PAYLOAD_KEY, ChatMessage } from '../../../../providers/ChatProvider';
import { ChatDrive } from '../../../../providers/ConversationProvider';
import {
  BoringFile,
  useDarkMode,
  LinkPreviewItem,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Triangle } from '@homebase-id/common-app/icons';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

export const ChatMedia = ({
  msg,
}: {
  msg: HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>;
}) => {
  const payloads = msg.fileMetadata.payloads?.filter(
    (payload) => payload.key !== DEFAULT_PAYLOAD_KEY
  );
  const isGallery = payloads && payloads.length >= 2;
  const navigate = useNavigate();

  if (!payloads || !payloads?.length) return null;
  if (isGallery) return <MediaGallery msg={msg} />;

  return (
    <MediaItem
      fileId={msg.fileId}
      fileLastModified={msg.fileMetadata.updated}
      payload={payloads[0]}
      onClick={() => navigate(`${msg.fileMetadata.appData.uniqueId}/${payloads[0].key}`)}
      previewThumbnail={isGallery ? undefined : msg.fileMetadata.appData.previewThumbnail}
      fit="contain"
      className="max-h-[35rem] w-full overflow-hidden rounded-lg"
    />
  );
};

const MediaItem = ({
  fileId,
  fileLastModified,
  payload,
  fit,
  children,
  onClick,
  previewThumbnail,
  className,
  onLoad,
}: {
  fileId: string | undefined;
  fileLastModified: number | undefined;
  payload: PayloadDescriptor | NewPayloadDescriptor;
  fit?: 'contain' | 'cover';
  children?: React.ReactNode;
  onClick: (() => void) | undefined;
  previewThumbnail?: EmbeddedThumb;
  className?: string;
  onLoad?: () => void;
}) => {
  const { isDarkMode } = useDarkMode();
  const dotYouClient = useDotYouClientContext();
  const isVideo =
    payload.contentType?.startsWith('video') ||
    payload.contentType === 'application/vnd.apple.mpegurl';
  const isAudio = payload.contentType?.startsWith('audio');
  const isImage = payload.contentType?.startsWith('image');
  const isLink = payload.key === CHAT_LINKS_PAYLOAD_KEY;

  return (
    <div
      className={`relative cursor-pointer ${fit === 'cover' ? 'aspect-square overflow-hidden' : ''} ${className || ''}`}
      onClick={onClick}
      data-thumb={!!previewThumbnail}
    >
      {!fileId || (payload as NewPayloadDescriptor)?.pendingFile ? (
        <PendingFile payload={payload} className={`h-full w-auto`} fit={fit} onLoad={onLoad} />
      ) : (
        <>
          {isVideo ? (
            <div
              style={
                previewThumbnail
                  ? { aspectRatio: `${previewThumbnail.pixelWidth / previewThumbnail.pixelHeight}` }
                  : undefined
              }
            >
              <OdinThumbnailImage
                dotYouClient={dotYouClient}
                fileId={fileId}
                fileKey={payload.key}
                lastModified={payload.lastModified || fileLastModified}
                targetDrive={ChatDrive}
                className={
                  fit === 'cover' ? 'h-full w-auto object-cover blur-sm' : `w-full blur-sm`
                }
                onLoad={onLoad}
                loadSize={{ pixelWidth: 200, pixelHeight: 200 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Triangle className="h-16 w-16 text-background" />
              </div>
            </div>
          ) : isAudio ? (
            <>
              <OdinAudio
                dotYouClient={dotYouClient}
                fileId={fileId}
                fileKey={payload.key}
                lastModified={payload.lastModified || fileLastModified}
                targetDrive={ChatDrive}
                onLoad={onLoad}
                className="w-full"
              />
              <OdinAudioWaveForm
                dotYouClient={dotYouClient}
                fileId={fileId}
                fileKey={payload.key}
                lastModified={payload.lastModified || fileLastModified}
                targetDrive={ChatDrive}
                onLoad={onLoad}
                isDarkMode={isDarkMode}
                className="my-3"
              />
            </>
          ) : isImage ? (
            <OdinImage
              dotYouClient={dotYouClient}
              fileId={fileId}
              fileKey={payload.key}
              lastModified={payload.lastModified || fileLastModified}
              targetDrive={ChatDrive}
              avoidPayload={isVideo}
              previewThumbnail={previewThumbnail}
              className={
                fit === 'cover' ? 'h-full w-full' : `max-h-[inherit] w-full max-w-[inherit]`
              }
              fit={fit}
              onLoad={onLoad}
            />
          ) : isLink ? (
            <LinkPreviewItem
              targetDrive={ChatDrive}
              fileId={fileId}
              payload={payload as PayloadDescriptor}
              className="p-1"
              onLoad={onLoad}
            />
          ) : (
            <BoringFile
              odinId={undefined}
              fileId={fileId}
              globalTransitId={undefined}
              targetDrive={ChatDrive}
              file={payload as PayloadDescriptor}
              onLoad={onLoad}
            />
          )}
        </>
      )}
      {children ? <>{children}</> : null}
    </div>
  );
};

const FIFTY_MEGBYTES = 50 * 1024 * 1024;
const PendingFile = ({
  payload,
  fit,
  className,
  onLoad,
}: {
  payload: NewPayloadDescriptor;
  fit?: 'contain' | 'cover';
  className?: string;
  onLoad?: () => void;
}) => {
  const fileUrl = useMemo(
    () =>
      (payload.pendingFileUrl || payload.pendingFile) &&
      (payload.contentType?.startsWith('video/') || payload.contentType?.startsWith('image/'))
        ? payload.pendingFileUrl ||
          (payload.pendingFile &&
            payload.pendingFile.size < FIFTY_MEGBYTES &&
            URL.createObjectURL(payload.pendingFile))
        : undefined,
    [payload.pendingFile]
  );

  if (fileUrl && payload.contentType?.startsWith('video/'))
    return (
      <video
        src={fileUrl}
        className={`${fit === 'cover' ? 'h-full w-full object-cover' : ''} ${className || ''}`}
        autoPlay={true}
        muted={true}
        loop={true}
      />
    );

  if (fileUrl && payload.contentType?.startsWith('image/'))
    return (
      <img
        src={fileUrl}
        className={`${fit === 'cover' ? 'h-full w-full object-cover' : ''} ${className || ''}`}
        onLoad={onLoad}
      />
    );

  return (
    <div
      className="aspect-square h-full w-full"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <BoringFile file={payload} className={'pointer-events-none h-full w-full animate-pulse'} />
    </div>
  );
};

const getEmbeddedThumbUrl = (previewThumbnail: EmbeddedThumb) =>
  `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;

const MediaGallery = ({
  msg,
}: {
  msg: HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>;
}) => {
  const payloads = msg.fileMetadata.payloads;
  const totalCount = (payloads && payloads.length) || 0;
  const maxVisible = 4;
  const countExcludedFromView = (payloads && payloads.length - maxVisible) || 0;
  const navigate = useNavigate();

  const previewThumbnail = msg.fileMetadata.appData.previewThumbnail;
  const tinyThumbUrl = useMemo(
    () => (previewThumbnail ? getEmbeddedThumbUrl(previewThumbnail) : undefined),
    [previewThumbnail]
  );

  return (
    <div
      className={`relative ${
        totalCount === 2 ? 'aspect-[2.02]' : 'aspect-square'
      } w-[75vw] overflow-hidden rounded-lg bg-background md:max-w-xs lg:max-w-xl`}
    >
      {tinyThumbUrl ? (
        <MediaGalleryLoading tinyThumbUrl={tinyThumbUrl} totalCount={totalCount} />
      ) : null}

      <div className={`${tinyThumbUrl ? 'absolute inset-0' : ''} grid grid-cols-2 gap-1`}>
        {msg.fileMetadata.payloads?.slice(0, 4)?.map((payload, index) => (
          <MediaGalleryItem
            key={payload.key || index}
            payload={payload}
            msg={msg}
            onClick={
              msg.fileId
                ? () => navigate(`${msg.fileMetadata.appData.uniqueId}/${payload.key}`)
                : undefined
            }
            isColSpan2={!!payloads && payloads.length === 3 && index === 2}
          >
            {index === maxVisible - 1 && countExcludedFromView > 0 ? (
              <div className="absolute inset-0 flex flex-col justify-center bg-black bg-opacity-40 text-6xl font-light text-white">
                <span className="block text-center">+{countExcludedFromView}</span>
              </div>
            ) : null}
          </MediaGalleryItem>
        ))}
      </div>
    </div>
  );
};

const MediaGalleryItem = ({
  payload,
  msg,
  isColSpan2,
  children,
  onClick,
}: {
  payload: PayloadDescriptor | NewPayloadDescriptor;
  msg: HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>;
  isColSpan2: boolean;
  children?: React.ReactNode;
  onClick: (() => void) | undefined;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div
      key={payload.key}
      className={`relative h-full w-full ${isColSpan2 ? 'aspect-[2/1]' : 'aspect-square'} ${
        isColSpan2 ? 'col-span-2' : ''
      } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <MediaItem
        fileId={msg.fileId}
        fileLastModified={msg.fileMetadata.updated}
        payload={payload}
        fit={'cover'}
        onClick={onClick}
        previewThumbnail={undefined}
        onLoad={() => setIsLoaded(true)}
      >
        {children}
      </MediaItem>
    </div>
  );
};

const MediaGalleryLoading = ({
  tinyThumbUrl,
  totalCount,
}: {
  tinyThumbUrl: string;
  totalCount: number;
}) => {
  const { isDarkMode } = useDarkMode();
  const singleRow = totalCount === 2;

  return (
    <div
      className={`relative ${totalCount === 2 ? 'aspect-[2.02]' : 'aspect-square'} h-auto w-full`}
    >
      <img src={tinyThumbUrl} className="h-full w-full blur-[20px]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundSize: '52% 52%',
          backgroundImage: `linear-gradient(to right, ${
            isDarkMode ? 'black' : 'white'
          } 0.25rem, transparent 1px)${
            !singleRow
              ? `, linear-gradient(to bottom, ${
                  isDarkMode ? 'black' : 'white'
                } 0.25rem, transparent 1px)`
              : ''
          }`,
          backgroundPositionX: '-5%',
          backgroundPositionY: '-5%',
        }}
      />
    </div>
  );
};
