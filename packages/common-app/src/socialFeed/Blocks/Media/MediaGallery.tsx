import {
  base64ToUint8Array,
  EmbeddedThumb,
  getChannelDrive,
  MediaFile,
} from '@youfoundation/js-lib';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Image, useIntersection, useDarkMode } from '@youfoundation/common-app';

interface MediaGalleryProps {
  odinId?: string;
  files: MediaFile[];
  channelId: string;
  className?: string;
  maxVisible?: number;
  postUrl: string;
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
}

const getEmbeddedThumbUrl = (previewThumbnail: EmbeddedThumb) => {
  const buffer = base64ToUint8Array(previewThumbnail.content);
  return window.URL.createObjectURL(new Blob([buffer], { type: previewThumbnail.contentType }));
};

export const MediaGallery = ({
  odinId,
  files,
  channelId,
  className,
  maxVisible = 4,
  postUrl,
  previewThumbnail,
  probablyEncrypted,
}: MediaGalleryProps) => {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slicedFiles = files.length > maxVisible ? files.slice(0, maxVisible) : files;
  const countExcludedFromView = files.length - slicedFiles.length;
  const navigate = useNavigate();

  const doNavigate = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
    e.stopPropagation();

    const targetUrl = `${postUrl}/${index}`;
    if (targetUrl.startsWith('http')) {
      window.location.href = targetUrl;
    } else {
      navigate(targetUrl, {
        state: { referrer: window.location.pathname },
        preventScrollReset: true,
      });
    }

    return false;
  };

  useIntersection(containerRef, () => {
    setIsInView(true);
  });

  const tinyThumbUrl = previewThumbnail ? getEmbeddedThumbUrl(previewThumbnail) : undefined;
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
            <div className="w-1/2 p-[2px]" key={file.fileId}>
              <div
                className={`relative ${
                  files.length === 2 ? 'aspect-[1/2]' : 'aspect-square'
                } h-auto w-full cursor-pointer`}
                onClick={(e) => doNavigate(e, index)}
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
