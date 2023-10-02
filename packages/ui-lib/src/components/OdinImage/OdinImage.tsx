import { useEffect, useMemo, useRef, useState } from 'react';
import useImage from '../../hooks/image/useImage';
import useTinyThumb from '../../hooks/image/useTinyThumb';
import Loader from '../ui/Icons/Loader/Loader';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import { TargetDrive, EmbeddedThumb, ImageSize, DotYouClient } from '@youfoundation/js-lib/core';

import '../../app/app.css';
import LoadingBlock from '../ui/LoadingBlock/LoadingBlock';

export interface OdinImageProps {
  dotYouClient: DotYouClient;
  odinId?: string;
  targetDrive: TargetDrive;
  fileId?: string;
  fit?: 'cover' | 'contain';
  position?: 'left' | 'right' | 'center';
  className?: string;
  alt?: string;
  title?: string;
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  avoidPayload?: boolean;
  explicitSize?: ImageSize | 'full';
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
  avoidPayload,
  explicitSize,
  onError,
}: OdinImageProps) => {
  const previewImgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLPictureElement>(null);
  const [loadSize, setLoadSize] = useState<ImageSize | 'full' | undefined>(undefined);

  const [isTinyLoaded, setIsTinyLoaded] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [isInView, setIsInView] = useState(false);
  useIntersection(wrapperRef, () => setIsInView(true));

  const embeddedThumbUrl = useMemo(() => {
    if (!previewThumbnail) return;
    return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
  }, [previewThumbnail]);

  const { getFromCache } = useImage(dotYouClient);
  const cachedImage = useMemo(
    () => (fileId ? getFromCache(odinId, fileId, targetDrive) : undefined),
    [fileId]
  );
  const skipTiny = !!previewThumbnail || !!cachedImage;

  const { data: tinyThumb, error: tinyError } = useTinyThumb(
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
    fetch: { data: imageData, error: imageError },
  } = useImage(
    dotYouClient,
    odinId,
    loadSize !== undefined ? fileId : undefined,
    targetDrive,
    loadSize !== 'full'
      ? loadSize
      : avoidPayload
      ? { pixelHeight: 200, pixelWidth: 200 }
      : undefined,
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

  useEffect(() => {
    if (tinyError && !loadSize) setLoadSize('full');
  }, [tinyError]);

  useEffect(() => {
    if (imageError) onError && onError();
  }, [imageError]);

  const calculateSize = () => {
    // If no element or nothing to create a size that has the aspect ratio, don't bother and load full...
    // If the image is an svg.. Then there are no thumbs and we should just load the full image;
    // TODO: Avoid this by having the Back-end return the payload if there's no matching thumbnail
    if (
      !previewImgRef.current ||
      (!tinyThumb?.sizes?.length && !skipTiny) ||
      previewThumbnail?.contentType === 'image/svg+xml'
    ) {
      setLoadSize('full');
      return;
    }

    if (explicitSize) {
      setLoadSize(explicitSize);
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

  if (tinyError || imageError) console.error({ fileId, tinyError, imageError });

  return (
    <figure
      className={`${className?.indexOf('absolute') !== -1 ? '' : 'relative'} overflow-hidden ${
        className ?? ''
      }`}
      ref={wrapperRef}
      data-odinid={odinId}
      data-load-size={
        loadSize && loadSize !== 'full'
          ? `${loadSize.pixelWidth}x${loadSize.pixelHeight}`
          : loadSize
      }
      data-fileid={fileId}
    >
      {!fileId ? null : isLoadingTiny ? (
        <LoadingBlock className="aspect-square h-full w-full" />
      ) : (
        <>
          <img
            src={previewUrl}
            className={`${imgClassNames} pointer-events-none absolute inset-0 m-auto ${
              cachedImage ? '' : 'blur-xl'
            } transition-opacity delay-500 ${isFinal ? 'opacity-0' : 'opacity-100'}`}
            ref={previewImgRef}
            width={width}
            height={height}
            key="tiny"
            onLoad={() => setIsTinyLoaded(true)}
            onError={() => setIsTinyLoaded(true)}
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
            // Setting the aspect ratio sets the figure element to be the same size as the image while the image is still loading
            style={{ aspectRatio: `${width ?? 1}/${height ?? 1}` }}
            className={`${
              fit === 'cover' ? 'absolute inset-0' : 'relative'
            } ${imgClassNames} transition-opacity duration-300 ${
              isFinal ? 'opacity-100' : 'opacity-0'
            }`}
            title={title}
            width={width}
            height={height}
            key="full"
            onLoad={() => {
              setIsFinal(true);
              onLoad && onLoad();
            }}
            onError={() => setIsFinal(true)}
          />
        </>
      )}
    </figure>
  );
};
