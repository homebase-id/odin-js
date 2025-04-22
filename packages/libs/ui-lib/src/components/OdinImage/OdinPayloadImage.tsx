import { OdinClient, ImageSize } from '@homebase-id/js-lib/core';
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
  odinClient: OdinClient;

  naturalSize?: ImageSize;
}

// Component to render a tiny thumb image;
// Uses either the previewThumbnail provided or fetches the thumbnail from the server
export const OdinPayloadImage = ({
  odinClient,
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
  preferObjectUrl,
  ...props
}: OdinPayloadImageProps) => {
  const {
    data: imageData,
    error: imageError,
    isFetched: isImageFetched,
  } = useImage({
    odinClient,
    odinId,
    imageFileId: fileId,
    imageGlobalTransitId: globalTransitId,
    imageFileKey: fileKey,
    imageDrive: targetDrive,
    size: undefined,
    probablyEncrypted,
    naturalSize,
    systemFileType,
    lastModified,
    preferObjectUrl,
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
