import { useEffect, useMemo, useRef, useState } from 'react';
import useImage from '../../hooks/image/useImage';
import useTinyThumb from '../../hooks/image/useTinyThumb';
import Loader from '../ui/Icons/Loader/Loader';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import {
  TargetDrive,
  EmbeddedThumb,
  ThumbSize,
  base64ToUint8Array,
  ImageSize,
  DotYouClient,
} from '@youfoundation/js-lib';

import '../../app/app.css';
import LoadingParagraph from '../ui/LoadingParagraph/LoadingParagraph';

export interface OdinImageProps {
  dotYouClient: DotYouClient;
  odinId?: string;
  targetDrive: TargetDrive;
  fileId: string | undefined;
  fit?: 'cover' | 'contain';
  position?: 'left' | 'right' | 'center';
  className?: string;
  alt?: string;
  title?: string;
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
  onLoad?: () => void;
}

export const OdinImage = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  fit,
  position,
  className,
  alt,
  title,
  previewThumbnail,
  probablyEncrypted,
  onLoad,
}: OdinImageProps) => {
  const previewImgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLPictureElement>(null);
  const [loadSize, setLoadSize] = useState<ThumbSize | 'full' | undefined>(undefined);

  const [isTinyLoaded, setIsTinyLoaded] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [isInView, setIsInView] = useState(false);
  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  const embeddedThumbUrl = useMemo(() => {
    if (!previewThumbnail) return;
    return window.URL.createObjectURL(
      new Blob([base64ToUint8Array(previewThumbnail.content)], {
        type: previewThumbnail.contentType,
      })
    );
  }, [previewThumbnail]);

  const { getFromCache } = useImage(dotYouClient);
  const cachedImage = useMemo(
    () => (fileId ? getFromCache(odinId, fileId, targetDrive) : undefined),
    [fileId]
  );
  const skipTiny = !!previewThumbnail || !!cachedImage;

  const { data: tinyThumb } = useTinyThumb(
    dotYouClient,
    odinId,
    isInView && !skipTiny ? fileId : undefined,
    targetDrive
  );
  const previewUrl = cachedImage?.url || embeddedThumbUrl || tinyThumb?.url;

  const naturalSize: ImageSize | undefined = tinyThumb
    ? { pixelHeight: tinyThumb.naturalSize.height, pixelWidth: tinyThumb.naturalSize.width }
    : cachedImage?.naturalSize || previewThumbnail;

  const {
    fetch: { data: imageData },
  } = useImage(
    dotYouClient,
    odinId,
    loadSize !== undefined ? fileId : undefined,
    targetDrive,
    loadSize !== 'full' ? loadSize : undefined,
    probablyEncrypted,
    naturalSize
  );

  useEffect(() => {
    if (loadSize !== undefined) return;
    // When we have a tinyThumb find the optimal size
    // With setTimeout to allow other tinies to load before blocking the main thread for those
    if (tinyThumb && tinyThumb.url?.length) {
      setTimeout(() => {
        calculateSize();
      }, 100);
    }

    // When we have a preview/cached image already, don't wait for the tinyThumb to load
    if (skipTiny && isTinyLoaded) calculateSize();
  }, [isInView, tinyThumb, isTinyLoaded]);

  const calculateSize = () => {
    // If no element or nothing to create a size that has the aspect ratio, don't bother and load full...
    if (!previewImgRef.current || (!tinyThumb?.sizes?.length && !skipTiny)) {
      setLoadSize('full');
      return;
    }

    const targetWidth = previewImgRef.current?.clientWidth;
    const targetHeight = previewImgRef.current?.clientHeight;

    // Find the best matching size in the meta sizes
    let matchingSize = tinyThumb?.sizes?.find((size) => {
      return targetWidth < size.pixelWidth && targetHeight < size.pixelHeight;
    });

    // If no exact size, pass the size of the img element
    if (!matchingSize) {
      // The preview size is heavily rounded so we recalculate the pixelHeight
      const validatedHeight = naturalSize
        ? Math.round(targetWidth * (naturalSize.pixelHeight / naturalSize.pixelWidth))
        : targetHeight;

      matchingSize = {
        contentType: previewThumbnail?.contentType ?? 'image/webp',
        pixelWidth: targetWidth,
        pixelHeight: validatedHeight,
      };
    }

    setLoadSize(matchingSize);
  };

  const isLoadingTiny = !imageData && !previewUrl;
  const width = naturalSize?.pixelWidth;
  const height = naturalSize?.pixelHeight;
  const imgClassNames = `${
    fit === 'cover'
      ? 'h-full w-full object-cover'
      : fit === 'contain'
      ? 'm-auto max-h-[inherit] max-w-full object-contain'
      : 'h-auto max-h-[inherit] w-full'
  } ${position === 'left' ? 'object-left' : position === 'right' ? 'object-right' : ''}`;

  return (
    <figure
      className={`${className?.indexOf('absolute') !== -1 ? '' : 'relative'} overflow-hidden ${
        className ?? ''
      }`}
      ref={wrapperRef}
    >
      {isLoadingTiny ? (
        <LoadingParagraph className="aspect-square h-full w-full" />
      ) : (
        <>
          <img
            src={previewUrl}
            className={`${imgClassNames} pointer-events-none absolute inset-0 ${
              cachedImage ? '' : 'blur-xl'
            } transition-opacity delay-500 ${isFinal ? 'opacity-0' : 'opacity-100'}`}
            ref={previewImgRef}
            width={width}
            height={height}
            key="tiny"
            onLoad={() => setIsTinyLoaded(true)}
          />
          {!isFinal ? (
            <div
              className={`absolute inset-0 flex text-white transition-opacity delay-[2000ms] ${
                isTinyLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Loader className="m-auto h-7 w-7" />
            </div>
          ) : null}
          <img
            src={imageData?.url}
            alt={alt}
            className={`${imgClassNames} transition-opacity duration-300 ${
              isFinal ? 'relative opacity-100' : 'opacity-0'
            }`}
            title={
              title ||
              `${fileId}@${
                loadSize && loadSize !== 'full'
                  ? `${loadSize.pixelWidth}x${loadSize.pixelHeight}`
                  : loadSize
              }`
            }
            width={width}
            height={height}
            key="full"
            onLoad={() => {
              setIsFinal(true);
              onLoad && onLoad();
            }}
          />
        </>
      )}
    </figure>
  );
};
