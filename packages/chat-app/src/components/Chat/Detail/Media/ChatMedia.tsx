import { HomebaseFile, EmbeddedThumb, PayloadDescriptor } from '@youfoundation/js-lib/core';
import { OdinImage, OdinThumbnailImage } from '@youfoundation/ui-lib';
import { ChatMessage } from '../../../../providers/ChatProvider';
import { ChatDrive } from '../../../../providers/ConversationProvider';
import { Triangle, useDarkMode } from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { useDotYouClientContext } from '../../../../hooks/auth/useDotYouClientContext';
import { useMemo, useState } from 'react';

export const ChatMedia = ({ msg }: { msg: HomebaseFile<ChatMessage> }) => {
  const payloads = msg.fileMetadata.payloads;
  const isGallery = payloads.length >= 2;
  const navigate = useNavigate();

  if (isGallery) return <MediaGallery msg={msg} />;

  return (
    <div className={`overflow-hidden rounded-lg`}>
      <MediaItem
        fileId={msg.fileId}
        fileLastModified={msg.fileMetadata.updated}
        payload={payloads[0]}
        onClick={() => navigate(`${msg.fileMetadata.appData.uniqueId}/${payloads[0].key}`)}
        previewThumbnail={isGallery ? undefined : msg.fileMetadata.appData.previewThumbnail}
      />
    </div>
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
  onLoad,
}: {
  fileId: string;
  fileLastModified: number;
  payload: PayloadDescriptor;
  fit?: 'contain' | 'cover';
  children?: React.ReactNode;
  onClick: () => void;
  previewThumbnail?: EmbeddedThumb;
  onLoad?: () => void;
}) => {
  const dotYouClient = useDotYouClientContext();
  const isVideo = payload.contentType.startsWith('video');

  return (
    <div
      className={`relative cursor-pointer ${fit === 'cover' ? 'aspect-square' : ''}`}
      onClick={onClick}
      data-thumb={!!previewThumbnail}
    >
      {!isVideo ? (
        <OdinImage
          dotYouClient={dotYouClient}
          fileId={fileId}
          fileKey={payload.key}
          lastModified={payload.lastModified || fileLastModified}
          targetDrive={ChatDrive}
          avoidPayload={isVideo}
          previewThumbnail={previewThumbnail}
          className={`h-full w-auto`}
          fit={fit}
          onLoad={onLoad}
        />
      ) : (
        <OdinThumbnailImage
          dotYouClient={dotYouClient}
          fileId={fileId}
          fileKey={payload.key}
          lastModified={payload.lastModified || fileLastModified}
          targetDrive={ChatDrive}
          className={`w-full blur-sm`}
          loadSize={{ pixelWidth: 1920, pixelHeight: 1080 }}
        />
      )}
      {isVideo ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Triangle className="h-16 w-16 text-background" />
        </div>
      ) : null}
      {children ? <>{children}</> : null}
    </div>
  );
};

const getEmbeddedThumbUrl = (previewThumbnail: EmbeddedThumb) =>
  `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;

const MediaGallery = ({ msg }: { msg: HomebaseFile<ChatMessage> }) => {
  const payloads = msg.fileMetadata.payloads;
  const totalCount = payloads.length;
  const maxVisible = 4;
  const countExcludedFromView = payloads.length - maxVisible;
  const navigate = useNavigate();

  const previewThumbnail = msg.fileMetadata.appData.previewThumbnail;
  const tinyThumbUrl = useMemo(
    () => (previewThumbnail ? getEmbeddedThumbUrl(previewThumbnail) : undefined),
    [previewThumbnail]
  );

  return (
    <div
      className={`relative ${totalCount === 2 ? 'aspect-[2.02]' : 'aspect-square'} w-[75vw] max-w-xs overflow-hidden rounded-lg bg-background`}
    >
      {tinyThumbUrl ? (
        <MediaGalleryLoading tinyThumbUrl={tinyThumbUrl} totalCount={totalCount} />
      ) : null}

      <div className={`${tinyThumbUrl ? 'absolute inset-0' : ''} grid grid-cols-2 gap-1`}>
        {msg.fileMetadata.payloads?.slice(0, 4)?.map((payload, index) => (
          <MediaGalleryItem
            key={payload.key}
            payload={payload}
            msg={msg}
            onClick={() => navigate(`${msg.fileMetadata.appData.uniqueId}/${payload.key}`)}
            isColSpan2={payloads.length === 3 && index === 2}
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
  payload: PayloadDescriptor;
  msg: HomebaseFile<ChatMessage>;
  isColSpan2: boolean;
  children?: React.ReactNode;
  onClick: () => void;
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
