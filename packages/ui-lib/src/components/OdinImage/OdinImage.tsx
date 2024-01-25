import { useEffect, useMemo, useRef, useState } from 'react';
import { useImage, useImageCache } from '../../hooks/image/useImage';
import { useTinyThumb } from '../../hooks/image/useTinyThumb';
import Loader from '../ui/Icons/Loader/Loader';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import {
  TargetDrive,
  EmbeddedThumb,
  ImageSize,
  DotYouClient,
  SystemFileType,
} from '@youfoundation/js-lib/core';

import '../../app/app.css';
import LoadingBlock from '../ui/LoadingBlock/LoadingBlock';
import { Exclamation } from '../ui/Icons/Exclamation';

interface OdinImageSource {
  dotYouClient: DotYouClient;
  odinId?: string;
  targetDrive: TargetDrive;
  fileKey: string | undefined;
  probablyEncrypted?: boolean;
  previewThumbnail?: EmbeddedThumb;

  avoidPayload?: boolean;
  explicitSize?: ImageSize | 'full';
  systemFileType?: SystemFileType;
  lastModified: number | undefined;
}

export interface OdinImageSourceWithFileId extends OdinImageSource {
  fileId: string | undefined;
  globalTransitId?: string | undefined;
}

interface OdinImageEvents {
  onLoad?: () => void;
  onError?: () => void;
}

interface OdinImageElement {
  fit?: 'cover' | 'contain';
  position?: 'left' | 'right' | 'center';
  className?: string;
  alt?: string;
  title?: string;
}

export type OdinImageProps = OdinImageSourceWithFileId & OdinImageElement & OdinImageEvents;

interface UseOdingImageInternalProps {
  wrapperRef: React.RefObject<HTMLPictureElement>;
  previewImgRef: React.RefObject<HTMLImageElement>;
}

type UseOdinImageProps = UseOdingImageInternalProps & OdinImageEvents & OdinImageSourceWithFileId;

const thumblessContentTypes = ['image/svg+xml', 'image/gif'];

export const OdinImage = ({
  odinId,

  fit,
  position,
  className,

  onLoad,
  ...props
}: OdinImageProps) => {
  const wrapperRef = useRef<HTMLPictureElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const {
    naturalSize,
    setIsTinyLoaded,
    isFinal,
    setIsFinal,
    previewUrl,
    weDontHaveSourceProps,
    weDontHaveAnything,
    loadSize,
    isFatalError,
    isTinyLoaded,
    previewIsTiny,
    onLoadError,
    finalUrl,
  } = useOdinImage({
    ...props,
    odinId,
    wrapperRef,
    previewImgRef,
  });

  if (!props.lastModified && props.fileId)
    console.warn('[OdinImage] No lastmodified', props.fileId, props.globalTransitId);

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
      data-fileid={(props as any).fileId}
      data-globaltransitid={(props as any).globalTransitId}
      data-filekey={props.fileKey}
      data-not={weDontHaveAnything ? 'true' : 'false'}
    >
      {weDontHaveSourceProps ? null : weDontHaveAnything ? (
        <LoadingBlock className="aspect-square h-full w-full" />
      ) : (
        <>
          <TinyThumb
            onLoad={() => setIsTinyLoaded(true)}
            onError={() => setIsTinyLoaded(true)}
            width={naturalSize?.pixelWidth}
            height={naturalSize?.pixelHeight}
            isFinal={isFinal}
            previewImgRef={previewImgRef}
            previewIsTiny={previewIsTiny}
            previewUrl={previewUrl}
            fit={fit}
            position={position}
          />
          {!isFinal && !isFatalError ? <TinyThumbLoader isTinyLoaded={isTinyLoaded} /> : null}
          <FinalImage
            finalUrl={finalUrl}
            isFinal={isFinal}
            alt={props.alt}
            fit={fit}
            position={position}
            width={naturalSize?.pixelWidth}
            height={naturalSize?.pixelHeight}
            title={props.title}
            onError={onLoadError}
            onLoad={() => {
              setIsFinal(true);
              onLoad && onLoad();
            }}
            key={loadSize === 'full' ? 'full' : `${loadSize?.pixelWidth}x${loadSize?.pixelHeight}`}
          />
          {isFatalError ? <FatalError /> : null}
        </>
      )}
    </figure>
  );
};

const TinyThumbLoader = ({ isTinyLoaded }: { isTinyLoaded: boolean }) => (
  <div
    className={`absolute inset-0 flex text-white transition-opacity delay-[2000ms] ${
      isTinyLoaded ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <Loader className="m-auto h-7 w-7" />
  </div>
);

const FatalError = () => (
  <div className={`absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-black/75`}>
    <Exclamation className="mr-2 h-6 w-6" /> <p>Something went wrong</p>
  </div>
);

interface TinyThumbImageProps extends Omit<OdinImageElement, 'className' | 'title' | 'alt'> {
  height?: number;
  width?: number;
  onLoad: () => void;
  onError: () => void;
  isFinal: boolean;
  previewImgRef: React.RefObject<HTMLImageElement>;
  previewUrl: string | undefined;
  previewIsTiny: boolean;
}
const TinyThumb = ({
  height,
  width,
  fit,
  position,
  previewUrl,
  previewIsTiny,
  isFinal,
  previewImgRef,
  onLoad,
  onError,
}: TinyThumbImageProps) => {
  const imgClassNames = `${
    fit === 'cover'
      ? 'h-full w-full object-cover'
      : fit === 'contain'
      ? 'm-auto max-h-[inherit] max-w-full object-contain'
      : 'h-auto max-h-[inherit] w-full'
  } ${position === 'left' ? 'object-left' : position === 'right' ? 'object-right' : ''}`;

  return (
    <img
      src={previewUrl}
      className={`${imgClassNames} pointer-events-none absolute inset-0 m-auto ${
        previewIsTiny ? '' : 'blur-xl'
      } transition-opacity delay-500 ${isFinal ? 'opacity-0' : 'opacity-100'}`}
      ref={previewImgRef}
      width={width}
      height={height}
      key="tiny"
      onLoad={onLoad}
      onError={onError}
    />
  );
};

interface FinalImageProps extends Omit<OdinImageElement, 'className'> {
  finalUrl: string | undefined;
  height?: number;
  width?: number;
  onLoad: () => void;
  onError: () => void;
  isFinal: boolean;
}
const FinalImage = ({
  finalUrl,
  height,
  width,
  isFinal,
  onLoad,
  onError,
  title,
  alt,
  fit,
  position,
}: FinalImageProps) => {
  const imgClassNames = `${
    fit === 'cover'
      ? 'h-full w-full object-cover'
      : fit === 'contain'
      ? 'm-auto max-h-[inherit] max-w-full object-contain'
      : 'h-auto max-h-[inherit] w-full'
  } ${position === 'left' ? 'object-left' : position === 'right' ? 'object-right' : ''}`;

  return (
    <img
      src={finalUrl}
      alt={alt}
      // Setting the aspect ratio sets the figure element to be the same size as the image while the image is still loading
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
      className={`${
        fit === 'cover' ? 'absolute inset-0' : 'relative'
      } ${imgClassNames} transition-opacity duration-300 ${isFinal ? 'opacity-100' : 'opacity-0'}`}
      title={title}
      width={width}
      height={height}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

const useOdinImage = (props: UseOdinImageProps) => {
  const {
    dotYouClient,
    fileId,
    fileKey,
    targetDrive,
    avoidPayload,
    explicitSize,
    odinId,
    onError,
    previewThumbnail,
    probablyEncrypted,
    wrapperRef,
    previewImgRef,
    systemFileType,
    lastModified,
  } = props;
  const globalTransitId = 'globalTransitId' in props ? props.globalTransitId : undefined;

  const [isInView, setIsInView] = useState(false);
  useIntersection(wrapperRef, () => setIsInView(true));

  const [loadSize, setLoadSize] = useState<ImageSize | 'full' | undefined>(undefined);

  const [isTinyLoaded, setIsTinyLoaded] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [isFatalError, setIsFatalError] = useState(false);

  const embeddedThumbUrl = useMemo(() => {
    if (!previewThumbnail) return;
    return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
  }, [previewThumbnail]);

  const { getFromCache } = useImageCache(dotYouClient);
  const cachedImage = useMemo(
    () =>
      fileId && fileKey
        ? getFromCache(odinId, fileId, globalTransitId, fileKey, targetDrive)
        : undefined,
    [fileId]
  );
  const skipTiny = !!previewThumbnail || !!cachedImage;

  const shouldLoadTiny = !skipTiny && isInView;

  const {
    data: tinyThumb,
    error: tinyError,
    isFetched: isTinyFetched,
  } = useTinyThumb(
    dotYouClient,
    odinId,
    shouldLoadTiny ? fileId : undefined,
    globalTransitId,
    fileKey,
    targetDrive,
    systemFileType
  );
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
    loadSize !== undefined ? globalTransitId : undefined,
    fileKey,
    targetDrive,
    loadSize !== 'full'
      ? loadSize
      : avoidPayload
      ? { pixelHeight: 200, pixelWidth: 200 }
      : undefined,
    probablyEncrypted,
    naturalSize,
    systemFileType,
    lastModified
  ).fetch;

  const calculateSize = () => {
    if (loadSize !== undefined) return;

    // If no element or nothing to create a size that has the aspect ratio, don't bother and load full...
    // If the image is an svg.. Then there are no thumbs and we should just load the full image;
    if (
      !previewImgRef.current ||
      (!tinyThumb?.sizes?.length && !skipTiny) ||
      thumblessContentTypes.includes(previewThumbnail?.contentType || tinyThumb?.contentType || '')
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
    // If targetWidth or targetHeight is 0, we can't calculate the size; And shouldn't even fetch
    if (!matchingSize && targetWidth && targetHeight) {
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

  if (tinyError || imageError) console.warn('[OdinImage]', { fileId, tinyError, imageError });

  const weDontHaveAnything = !previewUrl && !isTinyFetched && !imageData && !isImageFetched;
  const weDontHaveSourceProps = !fileId || !fileKey || !targetDrive;

  // If loading a thumb fails, try to load the full image
  const onLoadError = () => {
    if (loadSize !== 'full' && !avoidPayload) setLoadSize('full');
    else setIsFatalError(true);
  };

  const finalUrl = imageData?.url;

  return {
    naturalSize,
    setIsTinyLoaded,
    isFinal,
    setIsFinal,
    previewUrl,
    weDontHaveAnything,
    weDontHaveSourceProps,
    previewIsTiny: !cachedImage,
    loadSize,
    onLoadError,
    isFatalError,
    isTinyLoaded,
    finalUrl,
  };
};
