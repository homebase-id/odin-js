import { DotYouClient, ImageSize } from '@youfoundation/js-lib/core';
import { useImage } from '../../hooks/image/useImage';
import { useEffect } from 'react';
import { ImageEvents, ImageSource } from './types';

export interface OdinPayloadImageProps
  extends ImageSource,
    ImageEvents,
    Omit<
      React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>,
      'onError'
    > {
  dotYouClient: DotYouClient;

  naturalSize?: ImageSize;

  probablyEncrypted?: boolean;
}

// Component to render a tiny thumb image;
// Uses either the previewThumbnail provided or fetches the thumbnail from the server
export const OdinPayloadImage = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  systemFileType,
  lastModified,
  naturalSize,

  probablyEncrypted,

  onError,
  ...props
}: OdinPayloadImageProps) => {
  const {
    data: imageData,
    error: imageError,
    isFetched: isImageFetched,
  } = useImage(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    undefined,
    probablyEncrypted,
    naturalSize,
    systemFileType,
    lastModified
  ).fetch;

  // Error handling
  useEffect(() => {
    if (imageError) onError?.();
  }, [imageError]);

  useEffect(() => {
    if (isImageFetched && !imageData) onError?.();
  }, [imageData, isImageFetched]);

  return <img src={imageData?.url} onError={onError} {...props} />;
};
