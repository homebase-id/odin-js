import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { useState, useRef, useMemo } from 'react';
import { Video, Image, useIntersection, useDarkMode } from '@youfoundation/common-app';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { MediaFile, getChannelDrive } from '@youfoundation/js-lib/public';

interface MediaGalleryProps {
  odinId?: string;
  files: MediaFile[];
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

  useIntersection(containerRef, () => {
    setIsInView(true);
  });

  const tinyThumbUrl = useMemo(
    () => (previewThumbnail ? getEmbeddedThumbUrl(previewThumbnail) : undefined),
    [previewThumbnail]
  );
  const targetDrive = getChannelDrive(channelId);

  return (
    <div className={`overflow-hidden ${className ?? ''}`} ref={containerRef}>
      <div className="relative">
        {isInView && tinyThumbUrl ? (
          <MediaGalleryLoading tinyThumbUrl={tinyThumbUrl} totalCount={slicedFiles.length} />
        ) : null}

        <div
          className={`${tinyThumbUrl ? 'absolute inset-0' : ''} -m-[2px] flex flex-row flex-wrap`}
        >
          {slicedFiles.map((file, index) => (
            <div
              className={`${slicedFiles.length === 3 && index === 2 ? 'w-full' : 'w-1/2'} p-[2px]`}
              key={file.fileId}
            >
              <div
                className={`relative ${
                  files.length === 2 ? 'aspect-[1/2]' : 'aspect-square'
                } h-auto w-full cursor-pointer`}
                onClick={onClick ? (e) => onClick(e, index) : undefined}
              >
                {file.type === 'image' ? (
                  <Image
                    odinId={odinId}
                    className={`h-full w-auto`}
                    fileId={file.fileId}
                    targetDrive={targetDrive}
                    fit="cover"
                    probablyEncrypted={probablyEncrypted}
                  />
                ) : (
                  <Video
                    odinId={odinId}
                    targetDrive={targetDrive}
                    fileId={file.fileId}
                    className={`h-full w-auto object-cover`}
                    probablyEncrypted={probablyEncrypted}
                  />
                )}
                {index === maxVisible - 1 && countExcludedFromView > 0 ? (
                  <div className="absolute inset-0 flex flex-col justify-center bg-black bg-opacity-40 text-6xl font-light text-white">
                    <span className="block text-center">+{countExcludedFromView}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
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
    <div className={`relative aspect-square h-auto w-full`}>
      <img src={tinyThumbUrl} className="h-full w-full blur-[20px]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundSize: '52% 52%',
          backgroundImage: `linear-gradient(to right, ${
            isDarkMode ? 'black' : 'white'
          } 4px, transparent 1px)${
            !singleRow
              ? `, linear-gradient(to bottom, ${
                  isDarkMode ? 'black' : 'white'
                } 4px, transparent 1px)`
              : ''
          }`,
          backgroundPositionX: '-5%',
          backgroundPositionY: '-5%',
        }}
      />
    </div>
  );
};
