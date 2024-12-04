import {
  HomebaseFile,
  EmbeddedThumb,
  PayloadDescriptor,
  NewHomebaseFile,
  NewPayloadDescriptor,
  SystemFileType,
  DEFAULT_PAYLOAD_KEY,
} from '@homebase-id/js-lib/core';
import { OdinImage, OdinThumbnailImage, OdinAudio, OdinAudioWaveForm } from '@homebase-id/ui-lib';

import {
  BoringFile,
  useDarkMode,
  LinkPreviewItem,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Triangle } from '@homebase-id/common-app/icons';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  COMMUNITY_LINKS_PAYLOAD_KEY,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { getTargetDriveFromCommunityId } from '../../../providers/CommunityDefinitionProvider';

export const CommunityMedia = ({
  odinId,
  communityId,
  msg,
}: {
  odinId: string;
  communityId: string;
  msg: HomebaseFile<CommunityMessage> | NewHomebaseFile<CommunityMessage>;
}) => {
  const payloads = msg.fileMetadata.payloads?.filter((pyld) => pyld.key !== DEFAULT_PAYLOAD_KEY);
  const isGallery = payloads && payloads.length >= 2;
  const navigate = useNavigate();

  if (!payloads?.length) return null;
  if (isGallery) return <MediaGallery odinId={odinId} communityId={communityId} msg={msg} />;

  return (
    <div className={`my-1 w-full max-w-xs overflow-hidden rounded-lg`}>
      <MediaItem
        odinId={odinId}
        communityId={communityId}
        fileId={msg.fileId}
        systemFileType={msg.fileSystemType}
        fileLastModified={msg.fileMetadata.updated}
        payload={payloads[0]}
        fit={'contain'}
        onClick={() => navigate(`${msg.fileMetadata.appData.uniqueId}/${payloads[0].key}`)}
        previewThumbnail={isGallery ? undefined : msg.fileMetadata.appData.previewThumbnail}
      />
    </div>
  );
};

const MediaItem = ({
  odinId,
  communityId,
  fileId,
  systemFileType,
  fileLastModified,
  payload,
  fit,
  children,
  onClick,
  previewThumbnail,
  onLoad,
}: {
  odinId: string;
  communityId: string;
  fileId: string | undefined;
  systemFileType?: SystemFileType;
  fileLastModified: number | undefined;
  payload: PayloadDescriptor | NewPayloadDescriptor;
  fit?: 'contain' | 'cover';
  children?: React.ReactNode;
  onClick: (() => void) | undefined;
  previewThumbnail?: EmbeddedThumb;
  onLoad?: () => void;
}) => {
  const { isDarkMode } = useDarkMode();
  const dotYouClient = useDotYouClientContext();
  const isVideo =
    payload.contentType?.startsWith('video') ||
    payload.contentType === 'application/vnd.apple.mpegurl';
  const isAudio = payload.contentType?.startsWith('audio');
  const isImage = payload.contentType?.startsWith('image');
  const isLink = payload.key === COMMUNITY_LINKS_PAYLOAD_KEY;

  const targetDrive = getTargetDriveFromCommunityId(communityId);

  return (
    <div
      className={`relative cursor-pointer ${fit === 'cover' ? 'aspect-square' : ''}`}
      onClick={onClick}
      data-thumb={!!previewThumbnail}
    >
      {!fileId || (payload as NewPayloadDescriptor)?.pendingFile ? (
        <PendingFile payload={payload} className={`h-full w-auto`} fit={fit} onLoad={onLoad} />
      ) : (
        <>
          {isVideo ? (
            <>
              <OdinThumbnailImage
                dotYouClient={dotYouClient}
                odinId={odinId}
                fileId={fileId}
                fileKey={payload.key}
                systemFileType={systemFileType}
                lastModified={payload.lastModified || fileLastModified}
                targetDrive={targetDrive}
                className={`w-full blur-sm`}
                loadSize={{ pixelWidth: 1920, pixelHeight: 1080 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Triangle className="h-16 w-16 text-black dark:text-white" />
              </div>
            </>
          ) : isAudio ? (
            <>
              <OdinAudio
                dotYouClient={dotYouClient}
                odinId={odinId}
                fileId={fileId}
                fileKey={payload.key}
                systemFileType={systemFileType}
                lastModified={payload.lastModified || fileLastModified}
                targetDrive={targetDrive}
                onLoad={onLoad}
                className="w-full"
              />
              <OdinAudioWaveForm
                dotYouClient={dotYouClient}
                odinId={odinId}
                fileId={fileId}
                fileKey={payload.key}
                systemFileType={systemFileType}
                lastModified={payload.lastModified || fileLastModified}
                targetDrive={targetDrive}
                onLoad={onLoad}
                isDarkMode={isDarkMode}
                className="my-3"
              />
            </>
          ) : isImage ? (
            <OdinImage
              dotYouClient={dotYouClient}
              odinId={odinId}
              fileId={fileId}
              fileKey={payload.key}
              systemFileType={systemFileType}
              lastModified={payload.lastModified || fileLastModified}
              targetDrive={targetDrive}
              avoidPayload={isVideo}
              previewThumbnail={previewThumbnail}
              className={`h-full`}
              fit={fit}
              onLoad={onLoad}
            />
          ) : isLink ? (
            <LinkPreviewItem
              targetDrive={targetDrive}
              odinId={odinId}
              fileId={fileId}
              systemFileType={systemFileType}
              payload={payload as PayloadDescriptor}
              className="p-1"
            />
          ) : (
            <BoringFile
              odinId={odinId}
              fileId={fileId}
              systemFileType={systemFileType}
              targetDrive={targetDrive}
              file={payload as PayloadDescriptor}
              globalTransitId={undefined}
            />
          )}
        </>
      )}
      {children ? <>{children}</> : null}
    </div>
  );
};

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
      (payload.pendingFileUrl || payload.pendingFile) && payload.contentType?.includes('image/')
        ? payload.pendingFileUrl ||
          (payload.pendingFile && URL.createObjectURL(payload.pendingFile))
        : '',
    [payload.pendingFile]
  );

  if (!fileUrl)
    return (
      <div className="aspect-square h-full w-full animate-pulse bg-slate-400 dark:bg-slate-200"></div>
    );

  return (
    <img
      src={fileUrl}
      className={`${fit === 'cover' ? 'h-full w-full object-cover' : ''} ${className || ''}`}
      onLoad={onLoad}
    />
  );
};

const getEmbeddedThumbUrl = (previewThumbnail: EmbeddedThumb) =>
  `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;

const MediaGallery = ({
  odinId,
  communityId,
  msg,
}: {
  odinId: string;
  communityId: string;
  msg: HomebaseFile<CommunityMessage> | NewHomebaseFile<CommunityMessage>;
}) => {
  const payloads = msg.fileMetadata.payloads?.filter(
    (pyld) => pyld.key !== COMMUNITY_LINKS_PAYLOAD_KEY
  );
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
      className={`relative ${totalCount === 2 ? 'aspect-[2.02]' : 'aspect-square'} w-[75vw] max-w-[min(100%,20rem)] overflow-hidden rounded-lg bg-background`}
    >
      {tinyThumbUrl ? (
        <MediaGalleryLoading tinyThumbUrl={tinyThumbUrl} totalCount={totalCount} />
      ) : null}

      <div className={`${tinyThumbUrl ? 'absolute inset-0' : ''} grid grid-cols-2 gap-1`}>
        {msg.fileMetadata.payloads?.slice(0, 4)?.map((payload, index) => (
          <MediaGalleryItem
            odinId={odinId}
            communityId={communityId}
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
  odinId,
  communityId,
  payload,
  msg,
  isColSpan2,
  children,
  onClick,
}: {
  odinId: string;
  communityId: string;
  payload: PayloadDescriptor | NewPayloadDescriptor;
  msg: HomebaseFile<CommunityMessage> | NewHomebaseFile<CommunityMessage>;
  isColSpan2: boolean;
  children?: React.ReactNode;
  onClick: (() => void) | undefined;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div
      key={payload.key}
      className={`relative h-full w-full ${
        isColSpan2 ? 'aspect-[2/1]' : 'aspect-square'
      } ${isColSpan2 ? 'col-span-2' : ''} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <MediaItem
        odinId={odinId}
        communityId={communityId}
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
