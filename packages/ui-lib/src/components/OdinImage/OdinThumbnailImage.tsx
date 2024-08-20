import { DotYouClient, ImageSize } from '@youfoundation/js-lib/core';
import { useImage } from '../../hooks/image/useImage';
import { useEffect } from 'react';
import { ImageEvents, ImageSource } from './types';

export interface OdinThumbnailImageProps
  extends ImageSource,
    ImageEvents,
    Omit<
      React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>,
      'onError'
    > {
  dotYouClient: DotYouClient;

  loadSize: ImageSize | undefined;
  naturalSize?: ImageSize;

  probablyEncrypted?: boolean;
  preferObjectUrl?: boolean;
}

// Component to render a tiny thumb image;
// Uses either the previewThumbnail provided or fetches the thumbnail from the server
export const OdinThumbnailImage = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  systemFileType,
  lastModified,
  naturalSize,

  loadSize,
  probablyEncrypted,

  onError,
  ...props
}: OdinThumbnailImageProps) => {
  const fetchThumb = loadSize !== undefined;

  const {
    data: imageData,
    error: imageError,
    isFetched: isImageFetched,
  } = useImage({
    dotYouClient,
    odinId,
    imageFileId: fetchThumb ? fileId : undefined,
    imageGlobalTransitId: fetchThumb ? globalTransitId : undefined,
    imageFileKey: fileKey,
    imageDrive: targetDrive,
    size: loadSize,
    probablyEncrypted,
    naturalSize,
    systemFileType,
    lastModified,
  }).fetch;

  // Error handling
  useEffect(() => {
    if (imageError) onError?.();
  }, [imageError]);

  useEffect(() => {
    if (isImageFetched && !imageData) onError?.();
  }, [imageData, isImageFetched]);

  return <img src={imageData?.url} onError={onError} {...props} />;
};
