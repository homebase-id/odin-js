import { useEffect, useRef, useState } from 'react';
import { OdinPreviewImage, OdinPreviewImageProps } from './OdinPreviewImage';
import { OdinThumbnailImage } from './OdinThumbnailImage';
import { OdinPayloadImage } from './OdinPayloadImage';
import Loader from '../ui/Icons/Loader/Loader';
import { Exclamation } from '../ui/Icons/Exclamation';
import { ImageSize } from '@youfoundation/js-lib/core';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import { ThumbnailMeta } from '@youfoundation/js-lib/media';

export interface OdinImageProps
  extends Omit<Omit<OdinPreviewImageProps, 'onLoad'>, 'blockFetchFromServer'> {
  probablyEncrypted?: boolean;

  lazyLoad?: boolean;
  onLoad?: () => void;
  avoidPayload?: boolean;
  fit?: 'cover' | 'contain';
  position?: 'left' | 'right' | 'center';

  maxWidth?: string;
}

const thumblessContentTypes = ['image/svg+xml', 'image/gif'];

export const OdinImage = ({
  className,
  previewThumbnail,
  probablyEncrypted,
  avoidPayload,
  fit,
  onLoad,
  lazyLoad = true,
  maxWidth,
  ...props
}: OdinImageProps) => {
  const imgFitClassNames = `${fit === 'cover' ? 'w-full h-full object-cover' : fit === 'contain' ? 'max-h-[inherit] m-auto object-contain' : ''}`;

  const wrapperRef = useRef<HTMLPictureElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const [isTinyLoaded, setIsTinyLoaded] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [isFatalError, setIsFatalError] = useState(false);

  const [isInView, setIsInView] = useState(!lazyLoad);
  useIntersection(wrapperRef, () => setIsInView(true));

  const [loadSize, setLoadSize] = useState<ImageSize | 'full' | undefined>(undefined);

  const [naturalSize, setNaturalSize] = useState<ImageSize | undefined>(previewThumbnail);
  const [tinyThumb, setTinyThumb] = useState<ThumbnailMeta | undefined>();

  const weDontHaveSourceProps = !props.fileId || !props.fileKey || !props.targetDrive;

  const calculateSize = () => {
    if (loadSize !== undefined) return;

    // If no element or nothing to create a size that has the aspect ratio, don't bother and load full...
    // If the image is an svg.. Then there are no thumbs and we should just load the full image;
    if (
      !previewImgRef.current ||
      thumblessContentTypes.includes(
        previewThumbnail?.contentType || tinyThumb?.contentType || ''
      ) ||
      (tinyThumb && !tinyThumb?.sizes?.length)
    ) {
      setLoadSize(avoidPayload ? { pixelHeight: 200, pixelWidth: 200 } : 'full');
      return;
    }

    const targetWidth = previewImgRef.current?.clientWidth;
    const targetHeight = previewImgRef.current?.clientHeight;

    // Find the best matching size in the meta sizes
    let matchingSize = undefined;
    tinyThumb?.sizes?.find((size) => {
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
    // Once we have the tinyThumb, we can calculate the size
    if (isTinyLoaded) calculateSize();
  }, [isTinyLoaded]);

  if (weDontHaveSourceProps) return null;

  return (
    <figure
      className={`${className && className?.indexOf('absolute') !== -1 ? '' : 'relative'} overflow-hidden ${fit !== 'cover' ? 'm-auto h-auto w-full' : ''} ${
        className ?? ''
      }`}
      ref={wrapperRef}
      data-odinid={props.odinId}
      data-load-size={
        loadSize && loadSize !== 'full'
          ? `${loadSize.pixelWidth}x${loadSize.pixelHeight}`
          : loadSize
      }
      data-natural-size={
        naturalSize ? `${naturalSize.pixelWidth}x${naturalSize.pixelHeight}` : 'none'
      }
      data-probably-encrypted={probablyEncrypted}
      data-fileid={props.fileId}
      data-globaltransitid={props.globalTransitId}
      data-filekey={props.fileKey}
      style={
        naturalSize?.pixelWidth && naturalSize?.pixelHeight && fit !== 'cover'
          ? {
              aspectRatio: `${naturalSize?.pixelWidth}/${naturalSize?.pixelHeight}`,
              maxWidth: maxWidth || `${naturalSize.pixelWidth}px`,
            }
          : undefined
      }
    >
      <OdinPreviewImage
        {...props}
        previewThumbnail={previewThumbnail}
        onLoad={(naturalSize: ImageSize | undefined, tinyThumb: ThumbnailMeta | undefined) => {
          setNaturalSize((oldVal) => naturalSize || oldVal);
          setTinyThumb(tinyThumb);
          setIsTinyLoaded(true);
        }}
        className={`absolute inset-0 transition-opacity delay-500 ${imgFitClassNames} ${isFinal ? 'opacity-0' : 'opacity-100'}`}
        onError={() => setIsTinyLoaded(true)}
        ref={previewImgRef}
        blur="auto"
        blockFetchFromServer={!isInView}
      />

      {!isFinal && !isFatalError ? <TinyThumbLoader isTinyLoaded={isTinyLoaded} /> : null}
      {loadSize === 'full' ? (
        <OdinPayloadImage
          {...props}
          naturalSize={naturalSize}
          probablyEncrypted={probablyEncrypted}
          style={
            naturalSize?.pixelWidth && naturalSize?.pixelHeight
              ? { aspectRatio: `${naturalSize?.pixelWidth}/${naturalSize?.pixelHeight}` }
              : undefined
          }
          onLoad={() => setIsFinal(true)}
          onError={() => setIsFatalError(true)}
          className={`relative transition-opacity duration-300 ${imgFitClassNames} ${isFinal ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : loadSize !== undefined ? (
        <OdinThumbnailImage
          {...props}
          naturalSize={naturalSize}
          probablyEncrypted={probablyEncrypted}
          loadSize={loadSize}
          style={
            naturalSize?.pixelWidth && naturalSize?.pixelHeight
              ? { aspectRatio: `${naturalSize?.pixelWidth}/${naturalSize?.pixelHeight}` }
              : undefined
          }
          onLoad={() => {
            setIsFinal(true);
            onLoad?.();
          }}
          onError={() => setIsFatalError(true)}
          className={`relative transition-opacity duration-300 ${imgFitClassNames} ${isFinal ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
      {isFatalError ? <FatalError /> : null}
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
