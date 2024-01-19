import { DriveSearchResult, PayloadDescriptor } from '@youfoundation/js-lib/core';
import { OdinImage } from '@youfoundation/ui-lib';
import { ChatMessage } from '../../../../providers/ChatProvider';
import { ChatDrive } from '../../../../providers/ConversationProvider';
import { getLargestThumbOfPayload } from '@youfoundation/js-lib/helpers';
import { Triangle } from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { useDotYouClientContext } from '../../../../hooks/auth/useDotYouClientContext';

export const ChatMedia = ({ msg }: { msg: DriveSearchResult<ChatMessage> }) => {
  const payloads = msg.fileMetadata.payloads;
  const isGallery = payloads.length >= 2;
  const maxVisible = 4;
  const countExcludedFromView = payloads.length - maxVisible;
  const navigate = useNavigate();

  return (
    <div
      className={`overflow-hidden rounded-lg ${isGallery ? 'grid w-full grid-cols-2 gap-1' : ''}`}
    >
      {msg.fileMetadata.payloads?.slice(0, 4)?.map((payload, index) => {
        const isColSpan2 = payloads.length === 3 && index === 2;
        return (
          <div
            key={payload.key}
            className={`relative h-full w-full ${
              isGallery ? (isColSpan2 ? 'aspect-[2/1]' : 'aspect-square') : ''
            } ${isColSpan2 ? 'col-span-2' : ''}`}
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
  const dotYouClient = useDotYouClientContext();
  const isVideo = payload.contentType.startsWith('video');

  const largestThumb = getLargestThumbOfPayload(payload);

  return (
    <div
      className={`relative cursor-pointer ${fit === 'cover' ? 'aspect-square' : ''}`}
      onClick={onClick}
    >
      <OdinImage
        dotYouClient={dotYouClient}
        fileId={fileId}
        fileKey={payload.key}
        lastModified={payload.lastModified || fileLastModified}
        targetDrive={ChatDrive}
        avoidPayload={isVideo}
        explicitSize={largestThumb ? largestThumb : undefined}
        fit={fit}
      />
      {isVideo ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Triangle className="h-16 w-16 text-background" />
        </div>
      ) : null}
      {children ? <>{children}</> : null}
    </div>
  );
};
