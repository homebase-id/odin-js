import { EmbeddedThumb, PayloadDescriptor } from '@homebase-id/js-lib/core';
import { useState, useRef, useMemo } from 'react';
import { Image } from '../../../media/Image';
import { getChannelDrive } from '@homebase-id/js-lib/public';
import { useImageCache } from '@homebase-id/ui-lib';
import { useIntersection, useDarkMode, useOdinClientContext } from '../../../hooks';
import { Triangle } from '../../../ui/Icons';
import { BoringFile } from './PrimaryMedia';

interface MediaGalleryProps {
  odinId?: string;
  files: PayloadDescriptor[];
  fileId: string;
  globalTransitId?: string;
  lastModified: number | undefined;
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
  lastModified,
  channelId,
  className,
  maxVisible = 4,

  previewThumbnail,
  probablyEncrypted,
  onClick,
}: MediaGalleryProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isInView, setIsInView] = useState(false);
  useIntersection(containerRef, () => setIsInView(true));

  const [someLoaded, setSomeLoaded] = useState(false);

  const slicedFiles = files.length > maxVisible ? files.slice(0, maxVisible) : files;
  const countExcludedFromView = files.length - slicedFiles.length;

  const odinClient = useOdinClientContext();
  const { getFromCache } = useImageCache(odinClient);

  const targetDrive = getChannelDrive(channelId);
  const hasFirstInCache = useMemo(
    () => !!getFromCache(odinId, fileId, globalTransitId, slicedFiles[0].key, targetDrive),
    []
  );

  const tinyThumbUrl = useMemo(
    () =>
      previewThumbnail && !hasFirstInCache ? getEmbeddedThumbUrl(previewThumbnail) : undefined,
    [previewThumbnail]
  );

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
            } ${someLoaded || hasFirstInCache ? 'opacity-100' : 'opacity-0'} grid grid-cols-2 gap-1 bg-background`}
          >
            {slicedFiles.map((file, index) => {
              const isVideo =
                file.contentType.startsWith('video') ||
                file.contentType.startsWith('application/vnd.apple.mpegurl');

              return (
                <div
                  className={slicedFiles.length === 3 && index === 2 ? 'col-span-2' : undefined}
                  key={file.key}
                >
                  <div
                    className={`relative ${
                      slicedFiles.length === 3 && index === 2 ? 'aspect-[2/1]' : 'aspect-square'
                    } h-auto w-full cursor-pointer overflow-hidden`}
                    onClick={onClick ? (e) => onClick(e, index) : undefined}
                  >
                    {file.contentType.startsWith('image') || isVideo ? (
                      <Image
                        odinId={odinId}
                        className={`h-full w-auto ${isVideo ? 'blur-sm' : ''}`}
                        fileId={fileId}
                        globalTransitId={globalTransitId}
                        fileKey={file.key}
                        lastModified={lastModified}
                        targetDrive={targetDrive}
                        fit="cover"
                        probablyEncrypted={probablyEncrypted}
                        avoidPayload={isVideo}
                        onLoad={() => setSomeLoaded(true)}
                      />
                    ) : (
                      <BoringFile
                        odinId={odinId}
                        globalTransitId={globalTransitId}
                        targetDrive={getChannelDrive(channelId)}
                        fileId={fileId}
                        file={file}
                      />
                    )}

                    {index === maxVisible - 1 && countExcludedFromView > 0 ? (
                      <div className="absolute inset-0 flex flex-col justify-center bg-black bg-opacity-40 text-6xl font-light text-white">
                        <span className="block text-center">+{countExcludedFromView}</span>
                      </div>
                    ) : isVideo ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-background/40 rounded-full p-7 border border-foreground/20">
                          <Triangle className="text-foreground h-12 w-12" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
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
