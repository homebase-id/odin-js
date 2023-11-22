import { DriveSearchResult, PayloadDescriptor } from '@youfoundation/js-lib/core';
import { OdinImage } from '@youfoundation/ui-lib';
import { ChatMessage } from '../../providers/ChatProvider';
import { ChatDrive } from '../../providers/ConversationProvider';
import { getLargestThumbOfPayload } from '@youfoundation/js-lib/helpers';
import { Triangle, useDotYouClient } from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';

export const ChatMedia = ({ msg }: { msg: DriveSearchResult<ChatMessage> }) => {
  const payloads = msg.fileMetadata.payloads;
  const isGallery = payloads.length >= 2;
  const maxVisible = 4;
  const countExcludedFromView = payloads.length - maxVisible;
  const navigate = useNavigate();

  return (
    <div className={`${isGallery ? 'grid grid-cols-2 gap-1' : ''}`}>
      {msg.fileMetadata.payloads?.slice(0, 4)?.map((payload, index) => {
        return (
          <div
            key={payload.key}
            className={`relative h-full w-full ${isGallery ? 'aspect-square' : ''} `}
          >
            <MediaItem
              fileId={msg.fileId}
              fileLastModified={msg.fileMetadata.updated}
              payload={payload}
              fit={isGallery ? 'cover' : 'contain'}
              onClick={() => navigate(`${msg.fileMetadata.appData.uniqueId}/${payload.key}`)}
            >
              {index === maxVisible - 1 && countExcludedFromView > 0 ? (
                <div className="absolute inset-0 flex flex-col justify-center bg-black bg-opacity-40 text-6xl font-light text-white">
                  <span className="block text-center">+{countExcludedFromView}</span>
                </div>
              ) : null}
            </MediaItem>
          </div>
        );
      })}
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
}: {
  fileId: string;
  fileLastModified: number;
  payload: PayloadDescriptor;
  fit?: 'contain' | 'cover';
  children?: React.ReactNode;
  onClick: () => void;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const isVideo = payload.contentType.startsWith('video');

  const largestThumb = getLargestThumbOfPayload(payload);

  return (
    <div
      className={`relative h-full w-full cursor-pointer ${fit === 'cover' ? 'aspect-square' : ''}`}
      style={
        largestThumb
          ? { aspectRatio: `${largestThumb.pixelWidth}/${largestThumb.pixelHeight}` }
          : undefined
      }
      onClick={onClick}
    >
      <OdinImage
        dotYouClient={dotYouClient}
        fileId={fileId}
        fileKey={payload.key}
        lastModified={payload.lastModified || fileLastModified}
        targetDrive={ChatDrive}
        avoidPayload={isVideo}
        fit={fit}
      />
      {children ? (
        <>{children}</>
      ) : isVideo ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Triangle className="h-16 w-16 text-background" />
        </div>
      ) : null}
    </div>
  );
};
