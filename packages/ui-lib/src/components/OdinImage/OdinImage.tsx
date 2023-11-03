import { useEffect, useMemo, useRef, useState } from 'react';
import { useImage } from '../../hooks/image/useImage';
import { useTinyThumb } from '../../hooks/image/useTinyThumb';
import Loader from '../ui/Icons/Loader/Loader';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import { TargetDrive, EmbeddedThumb, ImageSize, DotYouClient } from '@youfoundation/js-lib/core';

import '../../app/app.css';
import LoadingBlock from '../ui/LoadingBlock/LoadingBlock';
import { Exclamation } from '../ui/Icons/Exclamation';

export interface OdinImageProps {
  dotYouClient: DotYouClient;
  odinId?: string;
  targetDrive: TargetDrive;
  fileId: string | undefined;
  fileKey: string | undefined;
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

const thumblessContentTypes = ['image/svg+xml', 'image/gif'];

export const OdinImage = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  fileKey,
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
  const [isFatalError, setIsFatalError] = useState(false);
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

  const shouldLoadTiny = !skipTiny && isInView;
  const {
    data: tinyThumb,
    error: tinyError,
    isFetched: isTinyFetched,
  } = useTinyThumb(dotYouClient, odinId, shouldLoadTiny ? fileId : undefined, targetDrive);
  const previewUrl = cachedImage?.url || embeddedThumbUrl || tinyThumb?.url;

  const naturalSize: ImageSize | undefined = tinyThumb
    ? { pixelHeight: tinyThumb.naturalSize.height, pixelWidth: tinyThumb.naturalSize.width }
    : cachedImage?.naturalSize || previewThumbnail;

  const {
    data: imageData,
    error: imageError,
    isFetched: isImageFetched,
  } = useImage(
    dotYouClient,
    odinId,
    loadSize !== undefined ? fileId : undefined,
    fileKey,
    targetDrive,
    loadSize !== 'full'
      ? loadSize
      : avoidPayload
      ? { pixelHeight: 200, pixelWidth: 200 }
      : undefined,
    probablyEncrypted,
    naturalSize
  ).fetch;

  useEffect(() => {
    // When we have a tinyThumb, we can calculate the size
    if (isTinyLoaded) calculateSize();

    // If there's no tinyThumb data available, trigger the calculateSize
    if (isTinyFetched && !tinyThumb) calculateSize();
  }, [tinyThumb, isTinyLoaded]);

  useEffect(() => {
    // When the tiny fails and we don't have a loadSize yet => calculcate it
    if (tinyError && !loadSize) calculateSize();
  }, [tinyError]);

  useEffect(() => {
    // Trigger error, when fetching the image fails;
    if (imageError) setIsFatalError(true);

    // Trigger error, when the data that comes back is emtpy;
    if (!imageData?.url && isImageFetched) setIsFatalError(true);
  }, [imageError, imageData]);

  useEffect(() => {
    if (isFatalError) onError && onError();
  }, [isFatalError]);

  const calculateSize = () => {
    if (loadSize !== undefined) return;

    // If no element or nothing to create a size that has the aspect ratio, don't bother and load full...
    // If the image is an svg.. Then there are no thumbs and we should just load the full image;
    // TODO: Avoid this by having the Back-end return the payload if there's no matching thumbnail
    if (
      !previewImgRef.current ||
      (!tinyThumb?.sizes?.length && !skipTiny) ||
      thumblessContentTypes.includes(previewThumbnail?.contentType ?? '')
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
        pixelWidth: targetWidth,
        pixelHeight: validatedHeight,
      };
    }

    setLoadSize(matchingSize);
  };

  const width = naturalSize?.pixelWidth;
  const height = naturalSize?.pixelHeight;
  const imgClassNames = `${
    fit === 'cover'
      ? 'h-full w-full object-cover'
      : fit === 'contain'
      ? 'm-auto max-h-[inherit] max-w-full object-contain'
      : 'h-auto max-h-[inherit] w-full'
  } ${position === 'left' ? 'object-left' : position === 'right' ? 'object-right' : ''}`;

  if (tinyError || imageError) console.warn('[OdinImage]', { fileId, tinyError, imageError });

  const weDontHaveAnything = !previewUrl && !isTinyFetched && !imageData && !isImageFetched;
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
      {!fileId || !fileKey ? null : weDontHaveAnything ? (
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
          {!isFinal && !isFatalError ? (
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
            key={loadSize === 'full' ? 'full' : `${loadSize?.pixelWidth}x${loadSize?.pixelHeight}`}
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
            onLoad={() => {
              setIsFinal(true);
              onLoad && onLoad();
            }}
            // If loading a thumb fails, try to load the full image
            onError={() => (loadSize !== 'full' ? setLoadSize('full') : setIsFatalError(true))}
          />
          {isFatalError ? (
            <div
              className={`absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-black/75`}
            >
              <Exclamation className="mr-2 h-6 w-6" /> <p>Something went wrong</p>
            </div>
          ) : null}
        </>
      )}
    </figure>
  );
};
