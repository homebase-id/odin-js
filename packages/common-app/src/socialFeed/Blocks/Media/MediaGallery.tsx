import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { useState, useRef, useMemo } from 'react';
import { Image, useIntersection, useDarkMode, Triangle } from '@youfoundation/common-app';
import { MediaFile, getChannelDrive } from '@youfoundation/js-lib/public';

interface MediaGalleryProps {
  odinId?: string;
  files: MediaFile[];
  fileId: string;
  globalTransitId?: string;
  channelId: string;
  className?: string;
  maxVisible?: number;
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => void;
}

const getEmbeddedThumbUrl = (previewThumbnail: EmbeddedThumb) =>
  `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;

export const MediaGallery = ({
  odinId,
  files,
  fileId,
  globalTransitId,
  channelId,
  className,
  maxVisible = 4,

  previewThumbnail,
  probablyEncrypted,
  onClick,
}: MediaGalleryProps) => {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slicedFiles = files.length > maxVisible ? files.slice(0, maxVisible) : files;
  const countExcludedFromView = files.length - slicedFiles.length;

  useIntersection(containerRef, () => setIsInView(true));

  const tinyThumbUrl = useMemo(
    () => (previewThumbnail ? getEmbeddedThumbUrl(previewThumbnail) : undefined),
    [previewThumbnail]
  );
  const targetDrive = getChannelDrive(channelId);

  return (
    <div className={`overflow-hidden ${className ?? ''}`} ref={containerRef}>
      <div className="relative">
        {tinyThumbUrl ? (
          <MediaGalleryLoading tinyThumbUrl={tinyThumbUrl} totalCount={slicedFiles.length} />
        ) : null}

        {isInView || !tinyThumbUrl ? (
          <div
            className={`${
              tinyThumbUrl ? 'absolute inset-0' : ''
            } grid grid-cols-2 gap-1 bg-background`}
          >
            {slicedFiles.map((file, index) => (
              <div
                className={slicedFiles.length === 3 && index === 2 ? 'col-span-2' : undefined}
                key={file.fileId + file.fileKey}
              >
                <div
                  className={`relative ${
                    slicedFiles.length === 3 && index === 2 ? 'aspect-[2/1]' : 'aspect-square'
                  } h-auto w-full cursor-pointer`}
                  onClick={onClick ? (e) => onClick(e, index) : undefined}
                >
                  <Image
                    odinId={odinId}
                    className={`h-full w-auto`}
                    fileId={file.fileId || fileId}
                    globalTransitId={file.fileId ? undefined : globalTransitId}
                    fileKey={file.fileKey}
                    targetDrive={targetDrive}
                    fit="cover"
                    probablyEncrypted={probablyEncrypted}
                    avoidPayload={file.type === 'video'}
                  />

                  {index === maxVisible - 1 && countExcludedFromView > 0 ? (
                    <div className="absolute inset-0 flex flex-col justify-center bg-black bg-opacity-40 text-6xl font-light text-white">
                      <span className="block text-center">+{countExcludedFromView}</span>
                    </div>
                  ) : file.type === 'video' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Triangle className="text-background h-16 w-16" />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
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
